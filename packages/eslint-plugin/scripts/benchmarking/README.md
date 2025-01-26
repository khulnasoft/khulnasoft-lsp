# Benchmarking @khulnasoft/require-i18n-strings

At the heart of `@khulnasoft/require-i18n-strings` is `isNonLocalizedStringValue(value: string)` which checks whether a string matches certain criteria and would be a false positive. For example CSS class lists, or `dateformat` strings, or URLs should not be externalized.

That being said most of the checks are regex checks, and some of them very expensive. In first tests, the following are especially bad.

- `([a-zA-Z][a-zA-Z-]+[a-zA-Z])+\.\w+` inside `isCssSelector` takes ~45% of the execution time
- `^([a-zA-Z0-9]+-[a-zA-Z0-9-]*[\s,]*)+$` inside `isKebabCase` takes ~27% of the execution time
- `^(\w+\.?)*\.\w{2,}$` inside `isFileName` takes ~24% of the execution time

Why do we actually care? In context of the KhulnaSoft project the execution of: `node --cpu-prof node_modules/.bin/eslint .` takes around 7:48 minutes on my machine, of which we spend 2:15 minutes (~27%) inside of `isNonLocalizedStringValue`. As this is a heavily CPU-bound issue, we likely spend way longer on slower machines, like e.g. CI.

## Benchmarking script

Inside of this folder there are two scripts used for benchmarking. The following commands are all executed inside `scripts/benchmarking` of the eslint-plugin repo. Please run a yarn install in this folder, as we have a few different dependencies which the main plugin doesn't need.

`getAllStrings.js`: This script can be used to extract strings JS and Vue files from a code base. Just provide globs as parameters.

For example, to extract all strings from within KhulnaSoft:

```bash
node ./getAllStrings.js "/path/to/gitlab/gitlab/{ee/,}app/**/*.{js,vue}"
```

The strings found are written into `allStrings.json`.
If you are doing iterations on `isNonLocalizedStringValue`,
the idea would be to just generate the lists of strings _once_,
in order to have a comparable baseline.

---

`checkAllStrings.js`: This script has a dual purpose: Writing results of the function to a file time-stamped txt file, in order to compare the results between iterations:

```bash
node ./checkAllStrings.js --write-results
```

In order to look at the efficiency of our function, we can get a CPU profile with:

```bash
node --cpu-prof ./checkAllStrings.js
```

The generated profile can be loaded into e.g. [speedscope]. The `left heavy` view will make it easily understandable where time is spent.
Thanks here for the blog series [Speeding up the JavaScript ecosystem][blog-series] which inspired me to look into this.

[speedscope]: https://www.speedscope.app
[blog-series]: https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-3/

## Baseline

On my machine I have generated a list of strings based on [1d13ebfbb0] in the KhulnaSoft project.
I found `47801` unique strings with `./getAllStrings.js`. For 13 of them the script times out.

`hyperfine --runs 3 "node ./checkAllStrings.js"` reports:

```
Benchmark 1: node ./checkAllStrings.js
  Time (mean ± σ):     42.315 s ±  0.186 s    [User: 40.149 s, System: 2.791 s]
  Range (min … max):   42.139 s … 42.510 s    3 runs
```

The CPU Profile shows that `isCssSelector` is the worst offender (60% of the time spend). Let's have a look.

[1d13ebfbb0]: https://gitlab.com/gitlab-org/gitlab/-/commit/1d13ebfbb0ca339452e883a047806e7f8c167197

## `isCssSelector`

```js
function isCssSelector(value) {
  return (
    /^,?\s?[\.\#\*\@]\w+.*/.test(value) ||
    /^[a-zA-Z]+[a-zA-Z-]*[\.\#\*]+[a-zA-Z]+[a-zA-Z-]*/.test(value) ||
    /([a-zA-Z][a-zA-Z-]+[a-zA-Z])+\.\w+/.test(value) ||
    /([a-zA-Z]+[a-zA-Z-]*|\*)\[.*\]/.test(value) ||
    /^[a-zA-Z]+[a-zA-Z-]*[\#\*]$/.test(value) ||
    /^(?:[0-9]+[a-z]|[a-z]+[0-9])[a-z0-9]*\s[a-z0-9][a-z0-9]+-[a-z0-9-]*$/.test(value) ||
    isListOfCssProperties(value) ||
    isListOfHtmlElements(value)
  );
}
```

The third RegExp in this function seems to be the offender: `/([a-zA-Z][a-zA-Z-]+[a-zA-Z])+\.\w+/`. So let us dissect it.

The `\.\w+` at the end is a literal `.` followed by _one or more_ word characters.
Because we actually do not care how _long_ the string of word characters at the end is, we simply can reduce it to: `\w`.

Now let's look at the capturing group: `([a-zA-Z][a-zA-Z-]+[a-zA-Z])+`.
One thing that makes it easier to parse Regexp: substitute a class of characters with a simple character.
So let us substitute `a-zA-Z` with `x`.
Now we have: `(x[x-]+x)+`.
The capturing group inside the brackets match strings starting with an `x`, followed by an amount of x and hyphens, and ending with an `x`.
The shortest strings matching are:

```
xxx
x-x
xxxx
xx-x
x-xx
x--x
```

The capture group can be repeated one or more times. So for example: `x-x` followed by `x-x-xx` => `x-xx-x-xx`.
But no matter the combination of two or more of those matching strings, the original regex `x[x-]+x` in matches all of them as well, which makes the repetition unnecessary and expensive.
So let's simplify it:

```js
/([a-zA-Z][a-zA-Z-]+[a-zA-Z])+\.\w+/ // | \w and \w+ are equivalent here, because we do not care how many word chars come after the first one
/([a-zA-Z][a-zA-Z-]+[a-zA-Z])+\.\w/  // | Let's substitute `[a-zA-Z]` with `x`
/(x[x-]+x)+\.\w/                     // | (x[x-]+x)+ and (x[x-]+x) are producing the same results here here
/(x[x-]+x)\.\w/                      // | Let's substitute `x` with `[a-zA-Z]` and remove the unnecessary capturing
/[a-zA-Z][a-zA-Z-]+[a-zA-Z]\.\w/
```

### Results

`hyperfine --runs 3 "node ./checkAllStrings.js"` reports:

````
Benchmark 1: node ./checkAllStrings.js
  Time (mean ± σ):     25.922 s ±  0.181 s    [User: 23.802 s, System: 2.670 s]
  Range (min … max):   25.726 s … 26.085 s    3 runs```
````

And 6 of our 13 strings are not timing out any longer. The next offender is `isKebabCase`. Let's have a look.

## `isKebabCase`

```js
function isKebabCase(value) {
  return (
    /^([a-zA-Z0-9]+-[a-zA-Z0-9-]*[\s,]*)+$/.test(value) ||
    /^([a-z0-9]+-[a-z0-9-]*)+(\s[a-z0-9-]*)*/.test(value) ||
    /(\s[a-z0-9-]*)*([a-z0-9]+-[a-z0-9-]*)+$/.test(value)
  );
}
```

The first regex is the offender here, but let us have a look at the last two first.
`^([a-z0-9]+-[a-z0-9-]*)+(\s[a-z0-9-]*)*` matches strings which starting with one or more `([a-z0-9]+-[a-z0-9-]*)`, followed by zero or more of `(\s[a-z0-9-]*)`.
Because we are not checking the complete string (missing `$` at the end), the latter is actually redundant, because for example: `a-b NONO` still tests true, despite `NONO` not matching that optional group.

If we substitute `[a-z0-9]` again with x, we get: `^(x+-[x-]*)+` for the first group.
As one match of the group, at the start of the string is enough, we can remove the capturing group and end up with `^x+-[x-]*`.
Now the last part of that group is also redundant, because we accept zero matches.

```js
/^([a-z0-9]+-[a-z0-9-]*)+(\s[a-z0-9-]*)*/ // | `(\s[a-z0-9-]*)*` is redundant, because the test will succeed whether it is there or not
/^([a-z0-9]+-[a-z0-9-]*)+/                // | Let's substitute `[a-z0-9]` with `x`
/^(x+-[x-]*)+/                            // | One match of the group is actually enough, so we can get rid of the capturing and +
/^x+-[x-]*/                               // | Similar to our first step, `[x-]*` became redundant, because zero matches are also fine.
/^x+-/                                    // | Let's substitute `[a-z0-9]` back in
/^[a-z0-9]+-/
```

Let's do the same for the last regex:

```js
/(\s[a-z0-9-]*)*([a-z0-9]+-[a-z0-9-]*)+$/ // | Again, `(\s[a-z0-9-]*)*` is redundant, because the test will succeed whether it is there or not
/([a-z0-9]+-[a-z0-9-]*)+$/                // | Let's substitute `[a-z0-9]` with `x`
/(x+-[x-]*)+$/                            // | One match of the group is actually enough, so we can get rid of the capturing and +
/x+-[x-]*$/                               // | Let's substitute `[a-z0-9]` back in
/[a-z0-9]+-[a-z0-9-]*$/
```

Now let us focus on the "beast" `/^([a-zA-Z0-9]+-[a-zA-Z0-9-]*[\s,]*)+$/`.
What is so interesting about this one? The `[\s,]*` bit is an optional list of whitespace characters and commas.
Essentially we want to check whether a list of values separated by those characters matches the rest.
So conceptually it isn't too different from:

```js
value.split(/[\s,]+/).every((item) => /^([a-zA-Z0-9]+-[a-zA-Z0-9-]*)+$/.test(item));
```

One caveat here: e.g. `foo-bar ,` would fail now because the split method actually would have the empty string `''` as the last value of the array.
However, we can build a little helper function:

```js
// Hey, I am actually doing splitAndTrim, but who cares.
function trimAndSplit(value, separator, trimLeft = true, trimRight = true) {
  const list = value.split(separator);
  if (trimRight && list[list.length - 1] === '') {
    list.pop();
  }
  if (trimLeft && list[0] === '') {
    list.shift();
  }
  return list;
}
// Aaand
trimAndSplit(value, /[\s,]+/, false, true).every((item) =>
  /^[a-zA-Z0-9]+-[a-zA-Z0-9-]*$/.test(item),
);
```

Nice. Now if we look at the regex, our exercise will let us simplify the thing again, back to: `/^[a-zA-Z0-9]+-[a-zA-Z0-9-]*$/`.

Let's combine all the things, and now we have:

```js
function isKebabCase(value) {
  return (
    /^[a-z0-9]+-/.test(value) ||
    /[a-z0-9]+-[a-z0-9-]*$/.test(value) ||
    trimAndSplit(value, /[\s,]+/, false, true).every((item) =>
      /^[a-zA-Z0-9]+-[a-zA-Z0-9-]*$/.test(item),
    )
  );
}
```

This solves the remaining checks which used to time out and hyperfine reports:

```bash
$ hyperfine --runs 3 "node ./checkAllStrings.js"

Benchmark 1: node ./checkAllStrings.js
  Time (mean ± σ):     15.141 s ±  0.015 s    [User: 13.198 s, System: 2.514 s]
  Range (min … max):   15.127 s … 15.158 s    3 runs
```

As we have no checks timing out any longer, also add a `--no-timeout` arg to checkAllStrings, as the timeout guard comes with a significant performance overhead.

```bash
$ hyperfine "node ./checkAllStrings.js --no-timeout"
  Time (mean ± σ):     320.3 ms ±   0.8 ms    [User: 324.3 ms, System: 10.5 ms]
  Range (min … max):   319.0 ms … 321.4 ms    10 runs
```

What used to take _minutes_, now takes just 320 ms.
Eslint inside the KhulnaSoft project has finished on my machine and produced the following results:

- `isNonLocalizedStringValue` now takes 197ms instead of 2:15 minutes (0.06% vs 29%) of the total run time
- In CI the execution time went down from ~1400s to ~940s, which is about a 30% improvement and aligns with the results from the profiling.

For now, this is such a big improvement, that we can move forward with getting this merged and save loads of time and cpu cycles.

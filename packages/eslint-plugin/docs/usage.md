## Installation

You'll first need to install [ESLint](http://eslint.org):

```bash
yarn add --dev eslint
```

Next, install `@khulnasoft/eslint-plugin`:

```bash
yarn add --dev @khulnasoft/eslint-plugin
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `@khulnasoft/eslint-plugin` globally.

## Usage (configs)

### `plugin:@khulnasoft/default`

Add `plugin:@khulnasoft/default` to the extends section of your `.eslintrc` configuration file.
This config is for our common javascript and Vue rules.

```yaml
extends:
  - 'plugin:@khulnasoft/default'
```

`plugin:@khulnasoft/default` uses the `espree` parser, shipped with `eslint` under the hood.

The configured JS version is `latest`, so eslint should be able to parse even the newest JS syntax.
You can adjust this behavior as [described here][ecma-version]. For example:

```yaml
parserOptions:
  ecmaVersion: 2020
```

That being said, when it comes to globals, we still assume a `ES2015` environment, which brought us `Set`, `Map`.
If you need newer globals, you can define newer env as [described here][globals]. For example:

```yaml
env:
  es2022: true
```

If you want to completely swap out the parser (e.g. using a typescript or babel parser), please follow
the [`eslint` docs][eslint-parser-config] if you only lint JS files,
and the [`vue-eslint-parser` docs][vue-eslint-parser-config] if you lint VUE files as well.

[ecma-version]: https://eslint.org/docs/latest/use/configure/language-options#specifying-parser-options
[globals]: https://eslint.org/docs/latest/use/configure/language-options#specifying-environments
[eslint-parser-config]: https://eslint.org/docs/latest/use/configure/parser
[vue-eslint-parser-config]: https://eslint.vuejs.org/user-guide/#how-to-use-a-custom-parser

### `plugin:@khulnasoft/i18n`

Add `plugin:@khulnasoft/i18n` to the extends section of your `.eslintrc` configuration file.
This config is for i18n linting on the KhulnaSoft project.

```yaml
extends:
  - 'plugin:@khulnasoft/i18n'
```

### `plugin:@khulnasoft/jest`

Add `plugin:@khulnasoft/jest` to the extends section of your `.eslintrc` configuration file.
This config is for Jest rules.

```yaml
extends:
  - 'plugin:@khulnasoft/jest'
```

## Usage (rules)

Add `@khulnasoft` to the plugins section of your `.eslintrc` configuration file:

```yaml
plugins:
  - @khulnasoft
```

Then configure the rules you want to use under the rules section, for example:

YAML:

```yaml
rules:
  '@khulnasoft/vue-require-i18n-attribute-strings': error
```

## VueJS (.vue files)

`@khulnasoft/eslint-plugin` can also detect strings requiring externalization for code within the `<script></script>` tags of a **.vue** file.

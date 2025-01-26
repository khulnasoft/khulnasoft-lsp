# @khulnasoft/require-i18n-strings

Detect a string which has been hard coded and requires externalization.

## Rule Details

This rule aims to assist in detecting and autofixing non i18n strings.

### Examples of **incorrect** code for this rule:

Unwrapped strings

```js
let foo = 'This would be incorrect, as it is not wrapped';
```

Unwrapped strings within objects (Yet to be implemented)

```js
let foo = {
  bar: 'This would be incorrect, as it is not wrapped',
};
```

Unwrapped strings within template literals (Yet to be implemented)

```js
let foo `This would be incorrect, {reason}`;
```

### Examples of **correct** code for this rule:

Wrapped string literals:

```js
let foo = __('This would be correct, as it is wrapped');
```

Single worded, lowercase strings

```js
const action = 'delete';
```

Single worded, uppercase strings

```js
const action = 'DELETE';
```

HTML property strings

```js
element.className = 'hidden';
element.style = 'display: none;';
```

URLs

```js
var url = 'https://example.com';
```

File paths

```js
var html = '<div class="foo"></div>';
```

Variable names matched by case

```js
var kebabCase = 'is-visible';
var snakeCase = 'is_visible';
var containsCamelCase = 'animationend webkitAnimationEnd';
```

## Options

Nothing

## Related rules

- [@vue-require-i18n-attribute-strings][./vue-require-i18n-attribute-strings.md]
- [@vue-require-i18n-strings][./vue-require-i18n-strings.md]

## When Not To Use It

If you don't need to externalize string literals in your project.

## Further Reading

- Code implementation of valid and invalid examples being tested: https://gitlab.com/gitlab-org/frontend/eslint-plugin/blob/main/tests/lib/rules/require-i18n-strings.js
- Original KhulnaSoft CE issue which triggered this: https://gitlab.com/gitlab-org/gitlab-ce/issues/57970

# @khulnasoft/vue-require-i18n-strings

Detect non externalized strings in vue `<template>`

## Rule Details

### Examples of **incorrect** code for this rule:

```html
<div>"test"</div>
<div>test</div>
<div>{{ "test" }}</div>
<div>{{ `test ${something}` }}</div>
```

### Examples of **correct** code for this rule:

Correctly externalized attributes or attributes that contain no letters

```html
<div>{{ __("test") }}</div>
<div>{{ test }}</div>
<p>→</p>
```

## Options

None

## Related rules

- [require-i18n-strings][./require-i18n-strings.md]
- [vue-require-i18n-attribute-strings][./vue-require-i18n-attribute-strings.md]

## When Not To Use It

If you don't need to externalize string literals in your project.

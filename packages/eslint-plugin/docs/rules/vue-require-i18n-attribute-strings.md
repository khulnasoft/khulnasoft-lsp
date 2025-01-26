# @khulnasoft/vue-require-i18n-attribute-strings

Detect non externalized strings in vue `<template>` attributes

## Rule Details

### Examples of **incorrect** code for this rule:

```html
<template>
  <input type="text" placeholder="This is placeholder text" />
  <img src="/some/image/path" alt="Amazing image" />
  <div aria-label="test this string">{{ "COOL" }}></div>
</template>
```

### Examples of **correct** code for this rule:

Correctly externalized attributes:

```html
<template>
  <input type="text" :placeholder="__('This is placeholder text')" />
  <img src="/some/image/path" :alt="__('Amazing image')" />
  <div :aria-label="__('test this string')">{{ "COOL" }}></div>
</template>
```

Attributes which don't need to be externalized:

```html
<template>
  <div :class="`js-${scope}-tab-${tab.scope}`"></div>
</template>
```

## Options

```json
{
  "@khulnasoft/vue-require-i18n-attribute-strings": [
    "error",
    {
      "attributes": [
        "alt",
        "placeholder",
        "aria-label",
        "aria-placeholder",
        "aria-roledescription",
        "aria-valuetext"
      ]
    }
  ]
}
```

- `attributes` ... attributes that are being checked for correct externalization

## Related rules

- [require-i18n-strings][./require-i18n-strings.md]
- [vue-require-i18n-strings][./vue-require-i18n-strings.md]

## When Not To Use It

If you don't need to externalize string literals in your project.

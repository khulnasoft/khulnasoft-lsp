# @khulnasoft/vue-require-valid-i18n-helpers

This rule is like [require-valid-i18n-helpers](./require-valid-i18n-helpers.md) for Vue templates.

## Rule Details

### Examples of **incorrect** code for this rule

```html
<template>
  <div>
    <!-- Invalid argument types -->
    {{ __(LABEL) }}
    {{ __(getDescription()) }}

    <!-- String interpolation -->
    {{ __(`String ${interpolation}`) }}
    {{ s__("SomeContext", `String ${interpolation}`) }}
    {{ n__("%d apple", `%d ${apples}`, appleCount) }}

    <!-- Missing translation namespace -->
    {{ s__('NamespacedTranslation') }}
  </div>
</template>
```

### Examples of **correct** code for this rule

```html
<template>
  <div>
    <!-- Valid argument type -->
    {{ __('Some label') }}

    <!-- Valid translation namespace -->
    {{ s__('Namespace|Translation') }}
  </div>
</template>
```

## Options

Nothing

## Related rules

- TBA

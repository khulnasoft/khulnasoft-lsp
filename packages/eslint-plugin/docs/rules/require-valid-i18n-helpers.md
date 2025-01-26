# @khulnasoft/require-valid-i18n-helpers

This rule enforces valid usages of the translation helpers (`__`, `s__` and `n__`). It requires the
following:

- All helpers should be called with string-literal arguments to ensure the strings are properly
  collected by the `gettext:regenerate` script.
- The helpers' arguments should not use string interpolation as this also prevents the strings from
  being collected.
- `__` should not be called with a namespace.
- `s__` requires a translation namespace to be provided.
- `n__` should use the same namespace, or no namespace at all, for both the singular and plural forms.

## Rule Details

### Examples of **incorrect** code for this rule

```js
// Invalid argument types
const label = __(LABEL);
const description = __(getDescription());

// Extraneous namespace
const globalTranslation = __('Global|Translation');

// String interpolation
const withStringInterpolation1 = __(`String ${interpolation}`);
const withStringInterpolation2 = s__("SomeContext", `String ${interpolation}`);
const withStringInterpolation3 = n__("%d apple", `%d ${apples}`, appleCount);

// Missing translation namespace
const namespacedTranslation = s__('NamespacedTranslation');

// Mismatching namespaces when pluralizing
const namespaceMismatch1 = n__('%d apple', 'Fruits|%d apples', 1);
const namespaceMismatch2 =n__('Vegetables|%d apple', 'Fruits|%d apples', 3);
```

### Examples of **correct** code for this rule

```js
// Valid argument type
const label = __('Some label');

// Valid gettext usage
const globalTranslation = __('Translation');

// Valid translation namespace
const namespacedTranslation = s__('Namespace|Translation');
// or
const otherNamespacedTranslation = s__('Namespace', 'Other translation');

// Matching namespaces
const namespacesMatch1 = n__('%d apple', '%d apples', 1);
const namespacesMatch2 =n__('Fruits|%d apple', 'Fruits|%d apples', 3);
```

## Options

Nothing

## Related rules

- TBA

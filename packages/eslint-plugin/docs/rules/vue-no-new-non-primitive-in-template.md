# @khulnasoft/vue-no-new-non-primitive-in-template

Throws when a Vue template binds to a new non-primitive, which can lead to wastefully
triggering observers and unintuitive behavior.

## Rule Details

### Examples of **incorrect** code for this rule

```html
<template>
  <my-component :foo="[thing1, thing2]">
</template>
```

### Examples of **correct** code for this rule

```html
<template>
  <my-component :foo="things">
</template>
```

## Options

```json
{
  "@khulnasoft/vue-no-new-non-primitive-in-template": [
    "error",
    {
      "deny": ["array", "object", "new"],
      "allowNames": ["^class$", "^$"]
    }
  ]
}
```

- `deny` contains a list of which kind of expressions to reject. For example `["array"]` would
  reject new array expressions, but allow objects and the new keyword.
- `allowNames` contains a list of regex for which binding property names are allowed to have
  new non-primitives in a template. For example `[Cc]lass$` would allow `<my-component :foo-class="[]">`.

## When Not To Use It

If you don't want to block new non-primitive expressions in Vue templates.

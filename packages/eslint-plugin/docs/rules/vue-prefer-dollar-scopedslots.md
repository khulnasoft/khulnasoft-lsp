# @khulnasoft/vue-prefer-dollar-scopedslots

Prefer $scopedSlots over $slots when using Vue 2.x.

Scoped slots are more flexible and powerful, ease migration to Vue 3.x, and
also work around https://github.com/vuejs/vue/issues/11084.

This rule should _not_ be used with Vue 3.x, since `$scopedSlots` was
[removed](https://v3-migration.vuejs.org/breaking-changes/slots-unification.html).
Instead, use
[`vue/no-deprecated-dollar-scopedslots-api`](https://eslint.vuejs.org/rules/no-deprecated-dollar-scopedslots-api.html).
It includes a fixer that will migrate `$scopedSlots` usage _back_ to `$slots`,
which is trivial since the API for Vue 2.x's `$scopedSlots` is identical to Vue
3.x's `$slots`.

## Rule Details

### Examples of **incorrect** code for this rule

```html
<div v-if="$slots.default">
  <slot></slot>
</div>
```

```javascript
export default {
  render(h) {
    return this.$slots.foo ? this.$slots.foo : null;
  },
};
```

### Examples of **correct** code for this rule

```html
<div v-if="$scopedSlots.default">
  <slot></slot>
</div>
```

```javascript
export default {
  render(h) {
    return this.$scopedSlots.foo
      ? this.$scopedSlots.foo() // Note the function call!
      : null;
  },
};
```

## Options

Nothing

## Related rules

- [`vue/no-deprecated-dollar-scopedslots-api`](https://eslint.vuejs.org/rules/no-deprecated-dollar-scopedslots-api.html) (for Vue 3.x)

## When Not To Use It

When using Vue 3.x.

# @khulnasoft/vue-require-required-key

Ensure required key is explicitly set for Vue props.

## Rule Details

When writing prop declaration one should make an explicit decision whether the prop is required or not.
Having this key consistently set reduces cognitive load when reading prop declarations.

### Examples of **incorrect** code for this rule

```js
props: {
  foo: {
    type: String,
  }
}
```

### Examples of **correct** code for this rule

```js
props: {
  foo: {
    type: String,
    required: false,
    default: 'bar'
  }
}
```

## Options

Nothing

## When Not To Use It

This rule is purely for readability.
Vue marks props as `required: false` if this option is not set.

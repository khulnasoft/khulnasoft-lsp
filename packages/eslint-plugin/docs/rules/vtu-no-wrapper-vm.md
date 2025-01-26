# @khulnasoft/vtu-no-wrapper-vm

Prevent direct access to `vm` internals for `@vue/test-utils` wrappers.
This is helpful for writing maintainable Vue tests.

See https://docs.khulnasoft.com/ee/development/testing_guide/frontend_testing.html#what-and-how-to-test

## Rule Details

### Examples of **incorrect** code for this rule

```javascript
it('calls spy when foo-ed', () => {
  // !! Direct access to `vm` properties !!
  wrapper.vm.onFoo();

  expect(spy).toHaveBeenCalled();
});
```

### Examples of **correct** code for this rule

```javascript
it('calls spy when foo-ed', () => {
  wrapper.find('button').trigger('click');

  expect(spy).toHaveBeenCalled();
});
```

## Options

```json
{
  "@khulnasoft/vtu-no-wrapper-vm": [
    "error",
    {
      "allow": ["$emit"]
    }
  ]
}
```

- `allow` contains a list of allowable property names that can be directly
  accessed under a vm.

## Related Rules

N/A.

## When Not To Use It

Don't use it if you don't want it.

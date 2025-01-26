# @khulnasoft/vtu-no-explicit-wrapper-destroy

Throw an error when detecting a `wrapper.destroy()` and/or a `wrapper = null` in Jest hooks: `afterEach`, `afterAll`, `beforeEach`, `beforeAll`.

## Rule Details

This rules checks if there are unnecessary calls and assignments in Jest hooks.

With [enabling auto-destroy](https://gitlab.com/gitlab-org/gitlab/-/merge_requests/100389)
we no longer need to call `wrapper.destroy()` explicitly in our test code.
It is also [not necessary to explicitly nullify a wrapper](https://gitlab.com/gitlab-org/frontend/rfcs/-/issues/71).

This rule checks the contents of Jest hooks and checks if something that looks like a wrapper for a vm gets explicitly destroyed.

### Examples of **incorrect** code for this rule

A variable containing `wrapper` or `vm` has a `.destroy()` call.

```javascript
afterEach(() => {
    drawerWrapper.destroy();
});
```

```javascript
afterEach(() => {
    vm.destroy();
});
```

A variable containing `wrapper` or `vm` has a `= null` assignment.

```javascript
afterEach(() => {
  wrapper = null;
  wrapper.destroy();
  jest.resetAllMocks();
});
```

### Examples of **correct** code for this rule

A variable that doesn't have a `wrapper` of `vm` is not treated as a target for this rule.

```javascript
afterEach(() => {
    instance.destroy();
    instance = null;
    resetHTMLFixture();
});
```

## Options

Nothing

## Related rules

None

## When Not To Use It

Feel free to disable the rule for any lines that you know are either
wrongly caught by the rule, or are the exceptional cases where the destroy
call or null assignment are required

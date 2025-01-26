# @khulnasoft/no-global-event-off

Throw an error when globally deregistering all event listeners.

## Rule Details

Modules that setup event listeners should only tear down the listeners
it can control. When `off(...)` is called without a second argument, it
removes all listeners, which most of the time **is not** intended and
[can cause hard-to-detect regression](https://gitlab.com/gitlab-org/gitlab/-/issues/228729)
caused by this hidden global coupling.

### Examples of **incorrect** code for this rule

`off` method called with only 1 argument.

```javascript
$('.foo').off('click');
```

`$off` method (Vue2 style) called with only 1 argument.

```javascript
eventHub.$off('gl-event');
```

### Examples of **correct** code for this rule

Pass the second argument to deregister a specific handler

```javascript
$('.foo').off('click', myClickHandler);
```

```javascript
eventHub.$off('gl-event', this.myClickHandler);
```

## Options

Nothing

## When Not To Use It

If a module is absolutely the one in control of all listeners for a given element, then it can be acceptable to disable this rule. For example:

- In test clean up code
- In some event listener utility with custom scoped events

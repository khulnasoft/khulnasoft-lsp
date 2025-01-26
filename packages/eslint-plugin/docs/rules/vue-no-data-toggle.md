# @khulnasoft/vue-no-data-toggle

Disallows the use of `data-toggle=""` property within Vue components.
These data attributes are utilized by Bootstrap to attach automatic
behaviors such as tooltips, popovers, and dropdowns, and using them
within a Vue component adds needless complexity and technical debt.

Utilizing a `@khulnasoft/ui` component like `GlPopover` or `GlDropdown` is
preferred whenever possible.

## Rule Details

### Examples of **incorrect** code for this rule

```html
<div class="dropdown">
  <button
    class="dropdown-menu-toggle dropdown-menu-full-width"
    type="button"
    data-toggle="dropdown"
    aria-expanded="false"
  >
    Some Dropdown
  </button>
  <div class="dropdown-menu">...</div>
</div>
```

### Examples of **correct** code for this rule

```html
<gl-dropdown text="Some dropdown">
  <gl-dropdown-item>First item</gl-dropdown-item>
  <gl-dropdown-item>Second item</gl-dropdown-item>
  <gl-dropdown-item>...</gl-dropdown-item>
</gl-dropdown>
```

## Options

Nothing

## Related rules

- TBA

## When Not To Use It

Exceptions can be made for instances where it is _currently_ impossible
to separate the use of the legacy Bootstrap behavior from the
implementation (e.g. dropdowns which use KhulnaSoft's deprecated jQuery
library for multi-select menus and rely on a specific DOM heirarchy)

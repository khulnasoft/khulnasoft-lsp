# @khulnasoft/no-runtime-template-compiler

Disallow components which rely on a runtime template compiler.

This means the `template` component option is not allowed, and instead some form
of ahead-of-time compiled `render` function _must_ be specified. This can take
the form of a hand-written `render` function, or a top-level template tag in
a Vue single file component.

This rule is useful if you ship without the Vue template compiler, and/or want
to minimise the work the client needs to do to render your components.

## Rule Details

### Examples of **incorrect** code for this rule

```html
<script>
  export default {
    template: '<i></i>',
  };
</script>
```

```js
Vue.component('FooBar', {
  template: '<i></i>',
});
```

If the template string starts with `#` it will be used as a querySelector and
use the selected element’s innerHTML as the template string, and compiled at
runtime:

```js
Vue.component('FooBar', {
  template: '#app',
});
```

If neither render function nor template option is present, the in-DOM HTML of
the mounting DOM element will be extracted as the template, and compiled at
runtime:

```html
<script>
  export default {
    el: '#app',
  };
</script>
```

If a template option is present as well as a render function, Vue will ignore
the template. So, while this is harmless in that no runtime compilation takes
place, it's potentially confusing to see both:

```js
Vue.component('FooBar', {
  template: '<i></i>',
  render(h) {
    return h('i');
  },
});
```

### Examples of **correct** code for this rule

```html
<script>
  export default {};
</script>

<template>
  <i></i>
</template>
```

```js
Vue.component('FooBar', {
  render(h) {
    return h('i');
  },
});
```

## Options

Nothing

## When Not To Use It

Do not use this rule if you rely on templates being compiled at runtime.

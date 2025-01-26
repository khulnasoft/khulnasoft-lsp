# @khulnasoft/vue-slot-name-casing

Ensures that slot names are kebab-cased

## Rule Details

### Examples of **incorrect** code for this rule

```html
<slot name="filepathPrepend"></slot>
<slot name="filepathPrepend"></slot>
<slot name="filepathPrepend"></slot>
<div>
  <template #filepathPrepend
    >example</template
  >
</div>
```

### Examples of **correct** code for this rule

```html
<slot name="filepath-prepend"></slot>
<slot name="filepath-prepend"></slot>
<slot name="filepath-prepend"></slot>
<div>
  <template #filepath-prepend
    >example</template
  >
</div>
```

## Options

No options

## Related rules

- TBA

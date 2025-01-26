<script>
import { GlButton } from '@khulnasoft/ui';
export default {
  name: 'QuickActions',
  components: {
    GlButton,
  },
  props: {
    disabled: {
      type: Boolean,
      required: true,
    },
  },
  methods: {
    onCreateCodeTask() {
      this.$emit('update-workflow-goal', 'Create code for ');
    },
    onFixBugTask() {
      this.$emit('update-workflow-goal', 'Fix bug ');
    },
  },
};
</script>
<template>
  <div class="gl-flex gl-items-center">
    <gl-button
      category="primary"
      variant="dashed"
      icon="plus-square-o"
      :disabled="disabled"
      @click="onCreateCodeTask"
      >Create code for...
    </gl-button>
    <gl-button
      category="primary"
      variant="dashed"
      icon="bug"
      class="gl-ml-3"
      :disabled="disabled"
      @click="onFixBugTask"
      >Fix bug...
    </gl-button>
  </div>
</template>

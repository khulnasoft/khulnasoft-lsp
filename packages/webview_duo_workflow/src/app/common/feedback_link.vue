<script>
import { GlButton } from '@khulnasoft/ui';
import { mapActions } from 'pinia';
import { useMainStore } from '../stores/main';

export default {
  components: {
    GlButton,
  },
  methods: {
    ...mapActions(useMainStore, ['openUrl']),
    onClick(event) {
      if (event) event.preventDefault();
      this.openUrl('https://gitlab.fra1.qualtrics.com/jfe/form/SV_9GmCPTV7oH9KNuu');
    },
  },
};
</script>
<template>
  <gl-button variant="link" icon="thumb-up" @click="onClick" class="gl-text-sm gl-mx-5">
    Give feedback</gl-button
  >
</template>

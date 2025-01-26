<script>
import { GlButton } from '@khulnasoft/ui';

export default {
  name: 'GlDuoChatPredefinedPrompts',
  components: {
    GlButton,
  },
  props: {
    /**
     * Array of predefined prompts to display. Every prompt should be a string which will be converted into a prompt when clicked.
     */
    prompts: {
      type: Array,
      required: true,
    },
  },
  methods: {
    handleClick(prompt) {
      /**
       * Emits the prompt string that was clicked.
       */
      this.$emit('click', prompt);
    },
  },
};
</script>
<template>
  <div class="gl-text-right">
    <div v-for="(prompt, index) in prompts" :key="`question-${index}`" class="gl-mt-3">
      <gl-button category="secondary" variant="confirm" @click="handleClick(prompt)"
        ><span class="gl-whitespace-normal">{{ prompt }}</span></gl-button
      >
    </div>
  </div>
</template>

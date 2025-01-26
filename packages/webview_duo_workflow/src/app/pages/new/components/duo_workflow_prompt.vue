<script>
import {
  GlAlert,
  GlButton,
  GlExperimentBadge,
  GlFormGroup,
  GlFormTextarea,
  GlIcon,
  GlLink,
  GlLoadingIcon,
} from '@khulnasoft/ui';
import { WORKFLOW_CREATION_PENDING, WORKFLOW_STARTED } from '../../../constants';
import { mapActions, mapState } from 'pinia';
import { useWorkflowStore } from '../../../stores/workflow';
import { useMainStore } from '../../../stores/main';
import { WORKFLOW_INDEX_APP } from '../../../router/constants';
import QuickActions from './quick_actions.vue';

export default {
  name: 'DuoWorkflowPrompt',
  components: {
    GlExperimentBadge,
    GlAlert,
    GlButton,
    GlFormGroup,
    GlFormTextarea,
    GlIcon,
    GlLink,
    GlLoadingIcon,
    QuickActions,
  },
  props: {
    isCreatingWorkflow: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      areTipsShown: true,
    };
  },
  computed: {
    ...mapState(useWorkflowStore, ['workflowGoal']),
    isPromptEmpty() {
      return this.workflowGoal.length === 0;
    },
    isPromptValid() {
      return this.workflowGoal.length <= 4096;
    },
    isStartWorkflowDisabled() {
      return !this.isPromptValid || this.isPromptEmpty;
    },
  },
  methods: {
    ...mapActions(useMainStore, ['openUrl']),
    ...mapActions(useWorkflowStore, ['setWorkflowGoal']),
    onQuickAction(val) {
      if (this.$refs?.goalForm?.$children?.length > 0) {
        // This refers to the input of the native textarea GL component
        this.$refs.goalForm.$children[0].focus();
      }
      this.setPrompt(val);
    },
    onOpenUrl() {
      this.openUrl('https://docs.khulnasoft.com/ee/user/duo_workflow');
    },
    cancelWorkflow() {
      this.$router.push({ name: WORKFLOW_INDEX_APP });
    },
    handleTipsDismiss() {
      this.areTipsShown = false;
    },
    startWorkflow() {
      this.$emit('start-workflow');
    },
    setPrompt(val) {
      this.setWorkflowGoal(val);
    },
  },
  promptId: 'duo-workflow-prompt',
};
</script>
<template>
  <div>
    <div>
      <div class="gl-flex gl-mb-4 gl-items-center">
        <h1>Draft code for your work</h1>
        <span class="gl-px-3">
          <gl-experiment-badge popover-placement="top" />
        </span>
      </div>
      <span class="gl-text-lg"
        >Good for junior-level tasks, in repositories up to medium size.</span
      >
    </div>
    <gl-alert
      v-if="areTipsShown"
      title="Get the best results"
      variant="tip"
      class="gl-mt-3"
      @dismiss="handleTipsDismiss"
      :dismissible="false"
    >
      <ul class="gl-pl-6 gl-mb-0">
        <li>Use mainly to work on small features or bugs.</li>
        <li>Be detailed with a clear definition of done.</li>
        <li>Try to add implementation examples, with commit or merge request IDs.</li>
        <li>Reference files, issue IDs, or merge request IDs.</li>
      </ul>
    </gl-alert>
    <gl-form-group class="gl-mt-8" label="Task description" :label-for="$options.promptId">
      <gl-form-textarea
        ref="goalForm"
        :value="workflowGoal"
        :id="$options.promptId"
        :disabled="isCreatingWorkflow"
        :no-resize="false"
        :state="isPromptValid"
        :character-count-limit="4096"
        placeholder="Specify a junior-level code task in detail…"
        @update="setPrompt"
      >
        <template #remaining-character-count-text="{ count }">
          <span v-if="count <= 100"> {{ count }} character(s) remaining. </span>
        </template>
        <template #character-count-over-limit-text="{ count }">
          {{ count }} character(s) over limit.
        </template>
      </gl-form-textarea>
      <quick-actions
        class="gl-mt-3"
        :disabled="!isPromptEmpty"
        @update-workflow-goal="onQuickAction"
      />
    </gl-form-group>
    <div class="gl-flex gl-gap-3 gl-mb-4 gl-pt-4 gl-items-baseline">
      <div>
        <gl-button
          variant="confirm"
          data-testid="start-workflow-button"
          :loading="isCreatingWorkflow"
          @click="startWorkflow"
          :disabled="isStartWorkflowDisabled"
          >Start
        </gl-button>
        <gl-button
          category="secondary"
          variant="confirm"
          class="gl-ml-3"
          data-testid="cancel-workflow-button"
          :disabled="isCreatingWorkflow"
          @click="cancelWorkflow"
          >Cancel
        </gl-button>
        <small class="gl-p-3">
          This AI feature autonomously changes code. Changes can be inaccurate. Review carefully.
        </small>
      </div>

    </div>
  </div>
</template>

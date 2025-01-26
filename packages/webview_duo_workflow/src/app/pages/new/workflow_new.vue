<script>
import { mapActions, mapState } from 'pinia';
import { WORKFLOW_SET_GOAL, WORKFLOW_STARTED } from '../../constants';
import ErrorNotifications from '../../common/error_notifications.vue';
import { useWorkflowStore } from '../../stores/workflow';
import { useMainStore } from '../../stores/main';
import DuoWorkflowPrompt from './components/duo_workflow_prompt.vue';
import { WORKFLOW_SHOW_APP } from '../../router/constants';

export default {
  name: 'KhulnaSoftDuoWorkflow',
  components: {
    DuoWorkflowPrompt,
    ErrorNotifications,
  },
  data() {
    return {
      isCreatingWorkflow: false,
    };
  },
  computed: {
    ...mapState(useWorkflowStore, ['initialState', 'workflowId']),
  },
  watch: {
    'initialState.goal': {
      immediate: true,
      handler(newGoal) {
        if (newGoal) {
          this.isCreatingWorkflow = true;
        }
      },
    },
    workflowId(newId) {
      if (newId) {
        this.isCreatingWorkflow = false;
        this.$router.push({ name: WORKFLOW_SHOW_APP, params: { workflowId: this.workflowId } });
      }
    },
  },
  methods: {
    ...mapActions(useMainStore, ['openUrl', 'stopSubscriptions']),
    ...mapActions(useWorkflowStore, ['startWorkflow']),
    onOpenUrl(url) {
      this.openUrl(url);
    },
    onStartWorkflow() {
      this.startWorkflow();
      this.isCreatingWorkflow = true;
    },
    onRequestError() {
      this.isCreatingWorkflow = false;
    },
  },
};
</script>
<template>
  <div>
    <error-notifications @request-error="onRequestError" />
    <div class="gl-flex gl-flex-col gl-h-full">
      <duo-workflow-prompt
        class="gl-grow gl-min-h-fit"
        :is-creating-workflow="isCreatingWorkflow"
        @open-url="onOpenUrl"
        @start-workflow="onStartWorkflow"
      />
    </div>
  </div>
</template>
<style lang="scss">
@import '../../styles.scss';
</style>

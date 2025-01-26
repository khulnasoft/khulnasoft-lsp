<script>
import { mapState, mapActions } from 'pinia';
import { useWorkflowStore } from '../../stores/workflow';
import { useMainStore } from '../../stores/main';
import DuoWorkflowExecution from './components/duo_workflow_execution.vue';
import ErrorNotifications from '../../common/error_notifications.vue';

export default {
  components: {
    DuoWorkflowExecution,
    ErrorNotifications,
  },
  computed: {
    ...mapState(useWorkflowStore, ['workflowStatus', 'workflowCheckpoint']),
  },
  created() {
    this.initialFetch();
  },
  beforeRouteLeave(to, from, next) {
    this.stopSubscriptions();
    this.resetActiveWorkflow();

    next();
  },
  methods: {
    ...mapActions(useWorkflowStore, [
      'getWorkflowById',
      'resetActiveWorkflow',
      'sendWorkflowEvent',
      'setWorkflowLoading',
    ]),
    ...mapActions(useMainStore, ['openUrl', 'stopSubscriptions']),
    onOpenUrl(url) {
      this.openUrl(url);
    },
    onSendWorkflowEvent({ eventType, message = '' }) {
      this.sendWorkflowEvent(eventType, message);
    },
    initialFetch() {
      this.getWorkflowById(this.$route.params.workflowId);
    },
    onRequestError() {
      this.setWorkflowLoading(false);
    },
  },
};
</script>
<template>
  <div>
    <error-notifications @request-error="onRequestError" />
    <duo-workflow-execution
      :checkpoint="workflowCheckpoint"
      :status="workflowStatus"
      @send-workflow-event="onSendWorkflowEvent"
    />
  </div>
</template>

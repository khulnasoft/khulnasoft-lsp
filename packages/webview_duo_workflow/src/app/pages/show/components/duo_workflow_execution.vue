<script>
import {
  GlButton,
  GlIcon,
  GlLoadingIcon,
  GlLink,
  GlModal,
  GlModalDirective,
  GlTooltipDirective,
} from '@khulnasoft/ui';
import DuoWorkflowCheckpoint from './duo_workflow_checkpoint.vue';
import DuoWorkflowChat from './duo_workflow_chat.vue';
import { getDuoWorkflowStatusDisplay } from '../../../utils';
import { DuoWorkflowStatus } from '../../../../types';
import { isPaused, isRunning, isTerminated } from '../../../../common/duo_workflow_status';
import { WorkflowEvent } from '../../../../common/duo_workflow_events';
import FeedbackLink from '../../../common/feedback_link.vue';
import { mapState } from 'pinia';
import { useWorkflowStore } from '../../../stores/workflow';

export default {
  name: 'DuoWorkflowExecution',
  components: {
    DuoWorkflowCheckpoint,
    DuoWorkflowChat,
    FeedbackLink,
    GlButton,
    GlIcon,
    GlLoadingIcon,
    GlLink,
    GlModal,
  },
  directives: {
    GlModalDirective,
    GlTooltipDirective,
  },
  props: {
    checkpoint: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      currentEvent: null,
    };
  },
  computed: {
    ...mapState(useWorkflowStore, ['workflowGoal', 'isLoadingWorkflow']),
    isSendingEvent() {
      return Boolean(this.currentEvent);
    },
    stopButton() {
      return {
        eventType: WorkflowEvent.STOP,
        icon: 'stop',
        category: 'primary',
        transitionStatus: 'Stopping...',
        message: 'Workflow stops after the current task completes.',
      };
    },
    togglePauseButton() {
      return isPaused(this.status)
        ? {
            eventType: WorkflowEvent.RESUME,
            icon: 'play',
            category: 'primary',
            transitionStatus: 'Resuming...',
            message: 'Execution will resume shortly.',
          }
        : {
            eventType: WorkflowEvent.PAUSE,
            icon: 'pause',
            category: 'secondary',
            transitionStatus: 'Pausing...',
            message: 'Execution pauses after the current task completes.',
          };
    },
    conversationHistory() {
      return this.checkpoint?.channel_values?.conversation_history || {};
    },
    statusIcon() {
      switch (this.status) {
        case DuoWorkflowStatus.CREATED:
        case DuoWorkflowStatus.RUNNING:
          return 'spinner';
        case DuoWorkflowStatus.PAUSED:
          return 'pause';
        case DuoWorkflowStatus.FINISHED:
          return 'check-circle';
        case DuoWorkflowStatus.STOPPED:
          return 'stop';
        case DuoWorkflowStatus.FAILED:
          return 'error';
        default:
          return 'play';
      }
    },
    isRunningStatus() {
      return this.status === DuoWorkflowStatus.RUNNING;
    },
    isTogglingPause() {
      return this.currentEvent === this.togglePauseButton.eventType;
    },
    isStopping() {
      return this.currentEvent === this.stopButton.eventType;
    },
    isRunning() {
      return this.status && isRunning(this.status);
    },
    enableActionButtons() {
      return (
        this.isRunning &&
        this.status !== DuoWorkflowStatus.CREATED &&
        !this.isStopping &&
        !this.isTogglingPause
      );
    },
    showActions() {
      return this.status && !isTerminated(this.status);
    },
    transitionText() {
      switch (this.currentEvent) {
        case this.togglePauseButton.eventType:
          return this.togglePauseButton.transitionStatus;
        case this.stopButton.eventType:
          return this.stopButton.transitionStatus;
        default:
          return 'Updating...';
      }
    },
    statusText() {
      if (this.isSendingEvent) {
        return this.transitionText;
      }

      return this.status ? getDuoWorkflowStatusDisplay(this.status) : 'Loading';
    },
  },
  watch: {
    status() {
      if (this.currentEvent) {
        this.currentEvent = null;
      }
    },
  },
  methods: {
    stopWorkflow() {
      this.currentEvent = this.stopButton.eventType;
      this.$toast.show(this.stopButton.message);
      this.$emit('send-workflow-event', { eventType: this.stopButton.eventType });
    },
    togglePause() {
      this.currentEvent = this.togglePauseButton.eventType;
      this.$toast.show(this.togglePauseButton.message);

      this.$emit('send-workflow-event', { eventType: this.togglePauseButton.eventType });
    },
    sendMessage(message) {
      this.$emit('send-workflow-event', {
        eventType: WorkflowEvent.MESSAGE,
        message,
      });
    },
  },
  modal: {
    actionPrimary: {
      text: 'Stop workflow',
      attributes: {
        variant: 'danger',
      },
    },
    actionSecondary: {
      text: 'Cancel',
      attributes: {
        variant: 'default',
      },
    },
  },
};
</script>
<template>
  <div class="gl-flex">
    <div class="gl-w-3/5 gl-pt-11">
      <div class="gl-border-b gl-mb-6">
        <div class="gl-flex gl-justify-between">
          <div class="gl-flex gl-justify-center gl-items-center">
            <gl-loading-icon
              v-if="isLoadingWorkflow"
              size="sm"
              variant="dots"
              data-testid="loading-icon"
            />
            <gl-loading-icon
              v-else-if="isRunningStatus"
              size="sm"
              data-testid="running-status-icon"
            />
            <gl-icon v-else :name="statusIcon" :size="16" data-testid="status-icon" />
            <h2 class="gl-ml-3 gl-text-lg gl-mb-0">{{ statusText }}</h2>
          </div>
          <div class="gl-flex gl-justify-center gl-items-center gl-min-h-7">
            <feedback-link class="gl-pr-5" />
            <div v-if="showActions">
              <gl-button
                title="Stop"
                :disabled="!enableActionButtons"
                :loading="isStopping"
                v-gl-modal-directive.stop-workflow-modal
                v-gl-tooltip.hover
                icon="stop"
                data-testid="stop-button"
              />
              <gl-modal
                modal-id="stop-workflow-modal"
                title="Stop workflow?"
                :action-primary="$options.modal.actionPrimary"
                :action-secondary="$options.modal.actionSecondary"
                @primary="stopWorkflow"
                size="sm"
              >
                Are you sure you want to stop this workflow? This action cannot be undone.
              </gl-modal>
              <gl-button
                class="gl-ml-3"
                variant="confirm"
                :category="togglePauseButton.category"
                :title="togglePauseButton.eventType"
                v-gl-tooltip.hover
                :disabled="!enableActionButtons"
                :icon="togglePauseButton.icon"
                :loading="isTogglingPause"
                @click="togglePause"
                data-testid="toggle-pause-button"
              />
            </div>
          </div>
        </div>
        <div v-if="workflowGoal" class="gl-text-secondary gl-py-5 gl-text-base" data-testid="goal">
          {{ workflowGoal }}
        </div>
        <div
          v-else
          class="gl-flex gl-animate-skeleton-loader gl-h-4 gl-my-5 gl-rounded-base"
          data-testid="goal-skeleton-loader"
        ></div>
      </div>

      <duo-workflow-checkpoint
        :checkpoint="checkpoint"
        :status="status"
        class="gl-min-w-1/2 gl-flex-grow"
      />
    </div>
    <div class="gl-w-2/5 gl-ml-4 gl-max-h-full">
      <duo-workflow-chat
        :conversation-history="conversationHistory"
        :status="status"
        @message="sendMessage"
        @resume="togglePause"
      />
    </div>
  </div>
</template>

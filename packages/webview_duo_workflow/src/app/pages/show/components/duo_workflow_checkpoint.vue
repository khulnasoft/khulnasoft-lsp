<script>
import { WORKFLOW_STARTED } from '../../../constants';
import StepStatusBadge from './step_status_badge.vue';
import CheckpointSkeletonLoader from './checkpoint_skeleton_loader.vue';
import { isPaused, isTerminated } from '../../../../common/duo_workflow_status';

export default {
  name: 'DuoWorkflowCheckpoints',
  components: {
    CheckpointSkeletonLoader,
    StepStatusBadge,
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
  computed: {
    currentStep() {
      // Is in planning phase. Once we have the running status on active steps,
      // we can simply show this active step based on the `RUNNING` status
      if (this.steps[0].status === 'Not Started') return null;

      return this.steps.find((step) => step.status !== 'Completed');
    },
    isPaused() {
      return isPaused(this.status);
    },
    isLoading() {
      return this.steps.length === 0 && !isTerminated(this.status);
    },
    steps() {
      return this.checkpoint?.channel_values?.plan?.steps || [];
    },
  },
  methods: {
    formatStep(step) {
      if (this.isCurrentStep(step) && this.isPaused) {
        return { ...step, status: 'Paused' };
      }

      return step;
    },
    isCurrentStep(step) {
      return this.currentStep && step.description === this.currentStep.description;
    },
  },
  currentStepCss: 'gl-rounded-lg selected-item',
};
</script>
<template>
  <div class="gl-mt-3">
    <checkpoint-skeleton-loader v-if="isLoading" />
    <ul v-else class="gl-list-style-none gl-pl-0 gl-text-sm">
      <li
        class="gl-flex gl-p-2"
        v-for="step in steps"
        :key="step.id"
        :class="isCurrentStep(step) ? $options.currentStepCss : ''"
      >
        <div>
          <step-status-badge :status="formatStep(step).status" />
        </div>
        <div class="gl-px-3">
          <span>{{ step.description }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { GlIcon } from '@khulnasoft/ui';

const STATUS_MAP = {
  NOT_STARTED: { status: 'Not Started', variant: 'subtle', icon: 'status-waiting' },
  IN_PROGRESS: { status: 'In Progress', variant: 'info', icon: 'status-running' },
  PAUSED: { status: 'Paused', variant: 'subtle', icon: 'status-paused' },
  COMPLETED: { status: 'Completed', variant: 'success', icon: 'status-success' },
  CANCELLED: { status: 'Cancelled', variant: 'danger', icon: 'status-cancelled' },
};

export default {
  name: 'StepStatusBadge',
  components: {
    GlIcon,
  },
  props: {
    status: {
      required: true,
      type: String,
    },
  },
  computed: {
    statusInfo() {
      return (
        Object.values(STATUS_MAP).find((v) => v.status === this.status) || {
          variant: 'subtle',
          icon: 'status-waiting',
        }
      );
    },
  },
};
</script>
<template>
  <gl-icon :name="statusInfo.icon" :variant="statusInfo.variant" :size="14" />
</template>

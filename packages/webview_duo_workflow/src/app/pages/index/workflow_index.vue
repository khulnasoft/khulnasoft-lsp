<script>
import { mapActions, mapState } from 'pinia';
import { GlButton, GlIcon, GlLoadingIcon } from '@khulnasoft/ui';
import ErrorNotifications from '../../common/error_notifications.vue';
import { getIDfromGraphqlId, getDuoWorkflowStatusDisplay } from '../../utils';
import { WORKFLOW_NEW_APP } from '../../router/constants';
import { useWorkflowStore } from '../../stores/workflow';
import { useMainStore } from '../../stores/main';
import ProjectPath from '../../common/project_path.vue';
import { useRequestErrorStore } from '../../stores/request_error';
import { useHealthCheckStore } from '../../stores/health_check';
import WorkflowTable from './components/workflow_table.vue';
import WorkflowEmptyState from './components/workflow_empty_state.vue';

export default {
  components: {
    ErrorNotifications,
    GlButton,
    GlIcon,
    GlLoadingIcon,
    ProjectPath,
    WorkflowEmptyState,
    WorkflowTable,
  },
  computed: {
    ...mapState(useMainStore, ['projectPath', 'isLoadingProjectPath']),
    ...mapState(useHealthCheckStore, ['isLoadingHealthCheck']),
    ...mapState(useWorkflowStore, ['workflows', 'areWorkflowsLoading']),
    hasWorkflows() {
      return this.workflows?.length > 0;
    },
    isLoading() {
      return this.areWorkflowsLoading || this.isLoadingHealthCheck || this.isLoadingProjectPath;
    },
  },
  watch: {
    projectPath: {
      immediate: true,
      handler(projectPath) {
        if (projectPath) {
          this.getUserWorkflows({ projectPath });
        }
      },
    },
  },
  methods: {
    ...mapActions(useHealthCheckStore, ['setValidProject']),
    ...mapActions(useWorkflowStore, ['getUserWorkflows', 'setWorkflowsLoading']),
    onRequestError() {
      this.setWorkflowsLoading(false);
    },
    toNewWorkflowRoute() {
      this.$router.push({ name: WORKFLOW_NEW_APP });
    },
  },
};
</script>

<template>
  <div>
    <div class="gl-mb-5 gl-flex gl-justify-between">
      <div>
        <h2 class="gl-text-size-h-display">Your workflows</h2>
        <project-path class="gl-mt-4" />
      </div>
      <div class="gl-self-center">
        <gl-button @click="toNewWorkflowRoute" variant="confirm" :disabled="isLoading">
          New workflow
        </gl-button>
      </div>
    </div>
    <error-notifications @request-error="onRequestError" />
    <gl-loading-icon v-if="isLoading" size="lg" class="gl-mt-20" />
    <workflow-empty-state v-else-if="!hasWorkflows" />
    <workflow-table v-else :workflows="workflows" />
  </div>
</template>
<style lang="scss">
@import '../../styles.scss';
</style>

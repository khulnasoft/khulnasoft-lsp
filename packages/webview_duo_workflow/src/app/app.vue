<script>
import { mapActions, mapState } from 'pinia';
import { GlLoadingIcon } from '@khulnasoft/ui';
import { useDockerStore } from './stores/docker';
import { useMainStore } from './stores/main';
import { useWorkflowStore } from './stores/workflow';
import { WORKFLOW_NEW_APP } from './router/constants';
import WorkflowIndex from './pages/index/workflow_index.vue';
import WorkflowHealthCheck from './common/workflow_health_check.vue';
import { useHealthCheckStore } from './stores/health_check';
import Breadcrumb from './router/breadcrumb.vue';
import { isPageWithoutContainer } from './router/utils';

export default {
  components: {
    Breadcrumb,
    GlLoadingIcon,
    WorkflowHealthCheck,
    WorkflowIndex,
  },
  created() {
    this.notifyAppReady();
    this.verifyDockerImage();
    this.getProjectPath();
  },
  computed: {
    ...mapState(useDockerStore, { isDockerReady: 'isReady' }),
    ...mapState(useHealthCheckStore, ['isDuoWorkflowEnabled', 'isLoadingHealthCheck']),
    ...mapState(useMainStore, ['projectPath', 'isLoadingProjectPath']),
    ...mapState(useWorkflowStore, ['initialState']),
    topMargin() {
      return isPageWithoutContainer(this.$route.name) ? '' : 'gl-pt-12';
    },
  },
  watch: {
    initialState() {
      if (this.initialState.goal) {
        this.$router.push({ name: WORKFLOW_NEW_APP });
      }
    },
  },
  methods: {
    ...mapActions(useDockerStore, ['verifyDockerImage']),
    ...mapActions(useHealthCheckStore, ['setProjectValid']),
    ...mapActions(useMainStore, ['getProjectPath', 'notifyAppReady']),
  },
};
</script>
<template>
  <div class="gl-px-4 gl-relative">
    <workflow-health-check v-if="!isDuoWorkflowEnabled" />
    <div v-else>
      <breadcrumb class="gl-absolute gl-top-7 gl-left-4" />
      <router-view :class="topMargin" />
    </div>
  </div>
</template>

<script>
import { GlBreadcrumb } from '@khulnasoft/ui';
import { WORKFLOW_INDEX_APP, WORKFLOW_NEW_APP, WORKFLOW_SHOW_APP } from './constants';

export default {
  name: 'WorkflowBreadcrumb',
  components: {
    GlBreadcrumb,
  },
  computed: {
    items() {
      return [{ text: 'KhulnaSoft Duo Workflow', to: '/' }].concat(this.currentPageData);
    },
    currentPageData() {
      switch (this.$route.name) {
        case WORKFLOW_NEW_APP:
          return [{ text: 'New', to: '/new' }];
        case WORKFLOW_SHOW_APP:
          return [{ text: this.$route.params.workflowId, to: `/${this.$route.params.workflowId}` }];
        default:
          return [];
      }
    },
  },
};
</script>
<template>
  <gl-breadcrumb :items="items" />
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { GlKeysetPagination, GlLink, GlTableLite } from '@khulnasoft/ui';
import { getIDfromGraphqlId, getDuoWorkflowStatusDisplay } from '../../../utils';
import { formatTimeAgo } from '../../../utils/time_utils';
import { WORKFLOW_SHOW_APP } from '../../../router/constants';
import { useWorkflowStore } from '../../../stores/workflow';
import { useMainStore } from '../../../stores/main';

export default {
  components: {
    GlKeysetPagination,
    GlLink,
    GlTableLite,
  },
  props: {
    workflows: {
      type: Array,
      required: true,
    },
  },
  computed: {
    ...mapState(useMainStore, ['projectPath']),
    ...mapState(useWorkflowStore, ['workflowsPageInfo']),
  },
  methods: {
    ...mapActions(useWorkflowStore, ['getUserWorkflows']),
    formatDate(date) {
      return formatTimeAgo(date);
    },
    handleNextPage() {
      this.getUserWorkflows({
        projectPath: this.projectPath,
        after: this.workflowsPageInfo.endCursor,
      });
    },
    handlePrevPage() {
      this.getUserWorkflows({
        projectPath: this.projectPath,
        before: this.workflowsPageInfo.startCursor,
      });
    },
    showPageLink(id) {
      return {
        name: WORKFLOW_SHOW_APP,
        params: { workflowId: this.toHumanId(id) },
      };
    },
    toHumanId(graphqlId) {
      return getIDfromGraphqlId(graphqlId);
    },
    toHumanStatus(status) {
      return getDuoWorkflowStatusDisplay(status?.toUpperCase());
    },
  },
  fields: [
    { key: 'goal', label: 'Description' },
    { key: 'humanStatus', label: 'Status' },
    { key: 'updatedAt', label: 'Updated' },
    { key: 'id', label: 'ID' },
  ],
};
</script>
<template>
  <div>
    <gl-table-lite :items="workflows" :fields="$options.fields">
      <template #cell(goal)="{ item }">
        <gl-link
          :to="showPageLink(item.id)"
          data-testid="workflow-goal-link"
          :data-test="JSON.stringify(showPageLink(item.id))"
          >{{ item.goal }}</gl-link
        >
      </template>
      <template #cell(id)="{ item }">
        <span data-testid="workflow-id" class="gl-text-secondary">{{ toHumanId(item.id) }}</span>
      </template>
      <template #cell(humanStatus)="{ item }">
        <span class="gl-text-secondary">
          {{ toHumanStatus(item.humanStatus) }}
        </span>
      </template>
      <template #cell(updatedAt)="{ item }">
        <span class="gl-text-secondary">
          {{ formatDate(item.updatedAt) }}
        </span>
      </template>
    </gl-table-lite>
    <gl-keyset-pagination
      v-bind="workflowsPageInfo"
      class="gl-flex gl-justify-center gl-mt-5"
      @prev="handlePrevPage"
      @next="handleNextPage"
    />
  </div>
</template>

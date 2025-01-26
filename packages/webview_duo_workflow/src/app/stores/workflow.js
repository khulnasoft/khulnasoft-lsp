import { defineStore } from 'pinia';
import { sendRequest, sendGraphqlRequest } from '../../common/bridge';
import { DEFAULT_DOCKER_IMAGE } from '../constants.ts';
import { GET_USER_WORKFLOWS } from '../graphql/queries';
import { useHealthCheckStore } from './health_check';
import { useMainStore } from './main';

export const useWorkflowStore = defineStore('workflow', {
  state: () => ({
    areWorkflowsLoading: false,
    isLoadingWorkflow: false,
    workflows: [],
    workflowsPageInfo: {},
    initialState: {},
    activeWorkflow: {
      id: '',
      goal: '',
      status: '',
      checkpoint: {},
    },
  }),
  getters: {
    workflowId: (state) => state.activeWorkflow.id,
    workflowGoal: (state) => state.activeWorkflow.goal,
    workflowStatus: (state) => state.activeWorkflow.status,
    workflowCheckpoint: (state) => state.activeWorkflow.checkpoint,
  },
  actions: {
    getUserWorkflows({ projectPath, before = null, after = null } = {}) {
      this.setWorkflowsLoading(true);

      const count = { first: null, last: null };

      if (before) {
        count.last = 20;
      } else {
        count.first = 20;
      }

      sendGraphqlRequest({
        query: GET_USER_WORKFLOWS,
        variables: { projectPath, before, after, first: count.first, last: count.last },
        eventName: 'updateWorkflows',
      });
    },
    getWorkflowById(workflowId) {
      this.setWorkflowLoading(true);
      this.setWorkflowId(workflowId);

      sendRequest('getWorkflowById', { workflowId });
    },
    onInitialState(initialState) {
      this.initialState = initialState;

      if (initialState.goal) {
        this.setWorkflowGoal(initialState.goal);
        this.startWorkflow();
      }
    },
    resetActiveWorkflow() {
      this.activeWorkflow = {
        id: '',
        goal: '',
        status: '',
        checkpoint: {},
      };
    },
    runWorkflow(dockerImage = DEFAULT_DOCKER_IMAGE) {
      sendRequest('startWorkflow', {
        goal: this.activeWorkflow.goal,
        image: dockerImage,
      });
    },
    sendWorkflowEvent(eventType, message = '') {
      sendRequest('sendWorkflowEvent', {
        eventType,
        workflowId: this.activeWorkflow.id,
        message,
      });
    },
    setWorkflowStarted(id) {
      this.setWorkflowId(id);
      this.setWorkflowLoading(false);
    },
    setWorkflowId(id) {
      this.activeWorkflow.id = id;
    },
    setWorkflowCheckpoint({ checkpoint }) {
      this.activeWorkflow.checkpoint = checkpoint;
    },
    setWorkflowGoal(goal) {
      this.activeWorkflow.goal = goal;
    },
    setWorkflowLoading(isLoading) {
      this.isLoadingWorkflow = isLoading;
    },
    setWorkflowsLoading(isLoading) {
      this.areWorkflowsLoading = isLoading;
    },
    setWorkflowStatus(status) {
      if (!status) return;
      this.activeWorkflow.status = status;
    },
    startWorkflow() {
      this.runWorkflow();
    },
    stopWorkflow() {
      sendRequest('cancelWorkflow', { workflowId: this.activeWorkflow.id });
    },
    updateWorkflows(data) {
      this.setWorkflowsLoading(false);

      this.workflowsPageInfo = data?.duoWorkflowWorkflows?.pageInfo || {};
      const workflows = data?.duoWorkflowWorkflows?.edges?.map((edge) => edge.node) || [];
      this.workflows = workflows;

      if (!workflows || workflows.length === 0) {
        const healthStore = useHealthCheckStore();
        const mainStore = useMainStore();

        healthStore.getHealthChecks(mainStore.projectPath);
      }
    },
  },
  events: {
    initialState: 'onInitialState',
    updateWorkflows: 'updateWorkflows',
    workflowCheckpoint: 'setWorkflowCheckpoint',
    workflowGoal: 'setWorkflowGoal',
    workflowStatus: 'setWorkflowStatus',
    workflowStarted: 'setWorkflowStarted',
  },
});

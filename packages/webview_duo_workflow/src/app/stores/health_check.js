import { defineStore } from 'pinia';
import { sendGraphqlRequest } from '../../common/bridge';
import { GET_WORKFLOW_ENABLEMENT_CHECKS_QUERY } from '../graphql/queries';
import { useDockerStore } from './docker';

export const useHealthCheckStore = defineStore('healthCheck', {
  state: () => ({
    healthChecks: null,
    isLoadingHealthCheck: false,
    isValidProject: true,
    isWorkflowEnabledForProject: true,
    isDockerConfigured: true,
  }),

  getters: {
    isDuoWorkflowEnabled(state) {
      const docker = useDockerStore();
      return state.isWorkflowEnabledForProject && state.isValidProject && docker.isReady;
    },
  },

  actions: {
    getHealthChecks(projectPath) {
      this.isLoadingHealthCheck = true;

      sendGraphqlRequest({
        eventName: 'setHealthChecks',
        query: GET_WORKFLOW_ENABLEMENT_CHECKS_QUERY,
        variables: { projectPath },
        supportedSinceInstanceVersion: {
          version: '17.7.0',
          resourceName: 'Get Duo Workflow permissions',
        },
      });
    },

    setHealthCheckData(result) {
      this.isLoadingHealthCheck = false;

      const healthCheckData = result?.project?.duoWorkflowStatusCheck;

      if (!healthCheckData) {
        this.setProjectValid(false);
      } else {
        this.healthChecks = healthCheckData.checks;
        this.isWorkflowEnabledForProject = healthCheckData.enabled;
      }
    },

    setProjectValid(isValid) {
      this.isValidProject = isValid;
    },
  },
  events: { setHealthChecks: 'setHealthCheckData' },
});

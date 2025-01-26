import { setActivePinia, createPinia } from 'pinia';
import { GET_WORKFLOW_ENABLEMENT_CHECKS_QUERY } from '../graphql/queries';
import { sendGraphqlRequest } from '../../common/bridge';
import { useHealthCheckStore } from './health_check';

jest.mock('../../common/bridge', () => ({
  sendGraphqlRequest: jest.fn(),
}));

describe('useHealthCheckStore', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useHealthCheckStore();
  });

  it('initializes with default state', () => {
    expect(store.healthChecks).toBeNull();
    expect(store.isDuoWorkflowEnabled).toBe(false);
    expect(store.isLoadingHealthCheck).toBe(false);
  });

  describe('getHealthChecks', () => {
    it('sends a request and sets isLoadingHealthCheck to true', () => {
      const projectPath = 'test/project';
      store.getHealthChecks(projectPath);

      expect(sendGraphqlRequest).toHaveBeenCalledWith({
        eventName: 'setHealthChecks',
        query: GET_WORKFLOW_ENABLEMENT_CHECKS_QUERY,
        variables: { projectPath },
        supportedSinceInstanceVersion: {
          resourceName: 'Get Duo Workflow permissions',
          version: '17.7.0',
        },
      });
      expect(store.isLoadingHealthCheck).toBe(true);
    });
  });

  describe('setHealthCheckData', () => {
    it('updates the store with health check data', () => {
      const healthCheckData = {
        project: {
          duoWorkflowStatusCheck: {
            checks: [
              { name: 'check1', value: true, message: 'Check 1 passed' },
              { name: 'check2', value: false, message: 'Check 2 failed' },
            ],
            enabled: false,
          },
        },
      };

      store.setHealthCheckData(healthCheckData);

      expect(store.healthChecks).toEqual(healthCheckData.project.duoWorkflowStatusCheck.checks);
      expect(store.isDuoWorkflowEnabled).toBe(false);
    });
  });

  describe('setProjectValid', () => {
    it('sets the project validity', () => {
      store.setProjectValid(false);
      expect(store.isValidProject).toBe(false);
    });
  });
});

import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { GlEmptyState, GlIcon, GlSprintf } from '@khulnasoft/ui';
import { useHealthCheckStore } from '../stores/health_check';
import { DOCKER_STATES, useDockerStore } from '../stores/docker';
import {
  INVALID_KHULNASOFT_PROJECT,
  PERMISSIONS_ERROR,
  USER_PERMISSIONS_ERROR,
  DOCKER_CONFIGURATION_ERROR,
  UNKNOWN_ERROR,
} from '../constants.ts';

import ProjectPath from './project_path.vue';
import WorkflowHealthCheck from './workflow_health_check.vue';

describe('WorkflowHealthCheck', () => {
  let wrapper;
  let pinia;
  let healthCheckStore;
  let dockerStore;

  beforeEach(() => {
    pinia = createTestingPinia();
    healthCheckStore = useHealthCheckStore();
    dockerStore = useDockerStore();
  });

  const createWrapper = (storeState = {}) => {
    healthCheckStore.$patch(storeState);

    wrapper = shallowMount(WorkflowHealthCheck, {
      global: {
        plugins: [pinia],
        stubs: {
          GlEmptyState,
          GlSprintf,
        },
      },
    });
  };

  const invalidProject = { isValidProject: false };
  const permissionsError = {
    isValidProject: true,
    isWorkflowEnabledForProject: false,
    healthChecks: [{ name: 'developer_access', value: true }],
  };
  const userPermissionsError = {
    isValidProject: true,
    isWorkflowEnabledForProject: false,
    healthChecks: [{ name: 'developer_access', value: false }],
  };
  const dockerError = {
    isValidProject: true,
    isWorkflowEnabledForProject: true,
    healthChecks: [],
  };
  const unknownError = {
    isValidProject: true,
    isWorkflowEnabledForProject: true,
    healthChecks: [],
  };

  const findProjectPathComponent = () => wrapper.findComponent(ProjectPath);

  describe.each`
    errorState                    | expectedTitle                         | expectedDescription                                                                                                                                             | initialStoreState       | withProjectPath | isDockerReady
    ${INVALID_KHULNASOFT_PROJECT}     | ${'Use with a KhulnaSoft project'}        | ${'KhulnaSoft Duo Workflow only works with KhulnaSoft projects'}                                                                                                        | ${invalidProject}       | ${false}        | ${true}
    ${PERMISSIONS_ERROR}          | ${'Unavailable for this project'}     | ${'resolve the following issues.'}                                                                                                                              | ${permissionsError}     | ${true}         | ${true}
    ${USER_PERMISSIONS_ERROR}     | ${'Unavailable to you'}               | ${'at least the Developer role in this project.'}                                                                                                               | ${userPermissionsError} | ${true}         | ${true}
    ${DOCKER_CONFIGURATION_ERROR} | ${'Configure Docker'}                 | ${"Before you can use KhulnaSoft Duo Workflow, you must configure Docker. It's used to execute arbitrary code, read and write files, and make API calls to KhulnaSoft"} | ${dockerError}          | ${false}        | ${false}
    ${UNKNOWN_ERROR}              | ${'KhulnaSoft Duo Workflow is disabled.'} | ${'Unable to validate the project permissions.'}                                                                                                                | ${unknownError}         | ${false}        | ${true}
  `(
    'when currentState is $errorState',
    ({ initialStoreState, expectedTitle, expectedDescription, withProjectPath, isDockerReady }) => {
      beforeEach(() => {
        createWrapper({
          isWorkflowEnabledForProject: false,
          ...initialStoreState,
        });
        dockerStore.status = isDockerReady
          ? DOCKER_STATES.IMAGE_PULLED
          : DOCKER_STATES.NOT_CONFIGURED;
      });

      it('renders the correct title', () => {
        expect(wrapper.find('h1').text()).toContain(expectedTitle);
      });

      it('renders the correct description', () => {
        expect(wrapper.findComponent(GlSprintf).attributes('message')).toContain(
          expectedDescription,
        );
      });

      it(`${withProjectPath ? 'renders' : 'does not render'} the project path component`, () => {
        expect(findProjectPathComponent().exists()).toBe(withProjectPath);
      });
    },

    describe('Health checks', () => {
      describe('when currentState is not permissions_error', () => {
        it.each`
          errorState                | initialStoreState
          ${INVALID_KHULNASOFT_PROJECT} | ${invalidProject}
          ${USER_PERMISSIONS_ERROR} | ${userPermissionsError}
          ${UNKNOWN_ERROR}          | ${unknownError}
        `('it does not render the health checks on $errorState error', ({ initialStoreState }) => {
          createWrapper(initialStoreState);

          expect(wrapper.findAll('li')).toHaveLength(0);
        });
      });

      describe('when there is a permissions_error', () => {
        beforeEach(() => {
          createWrapper({
            isValidProject: true,
            isWorkflowEnabledForProject: false,
            healthChecks: [
              { name: 'developer_access', value: true, message: 'Message 1' },
              { name: 'check2', value: false, message: 'Message 2' },
            ],
          });
          dockerStore.status = DOCKER_STATES.IMAGE_PULLED;
        });

        it('renders the list of health checks', () => {
          const listItems = wrapper.findAll('li');
          expect(listItems).toHaveLength(2);

          expect(listItems.at(0).text()).toContain('Message 1');
          expect(listItems.at(1).text()).toContain('Message 2');
        });

        it('computes the correct status icon and variant for each check', () => {
          const checkIcons = wrapper.findAllComponents(GlIcon);

          expect(checkIcons.at(0).props()).toMatchObject({
            name: 'status-success',
            variant: 'success',
          });

          expect(checkIcons.at(1).props()).toMatchObject({
            name: 'status-failed',
            variant: 'danger',
          });
        });
      });
    }),
  );
});

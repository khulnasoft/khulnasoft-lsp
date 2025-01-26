import { nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useDockerStore, DOCKER_STATES } from './stores/docker';
import { useMainStore } from './stores/main';
import { useWorkflowStore } from './stores/workflow';
import { useHealthCheckStore } from './stores/health_check';
import { WORKFLOW_NEW_APP, WORKFLOW_SHOW_APP } from './router/constants';
import App from './app.vue';
import WorkflowHealthCheck from './common/workflow_health_check.vue';
import Breadcrumb from './router/breadcrumb.vue';

describe('App.vue', () => {
  let wrapper;
  let dockerStore;
  let workflowStore;
  let mainStore;
  let healthStore;

  let verifyDockerImageSpy;
  let notifyAppReadySpy;

  const routerPush = jest.fn();

  const createComponent = (routeName = WORKFLOW_SHOW_APP) => {
    const pinia = createTestingPinia({
      stubActions: false,
    });
    wrapper = shallowMount(App, {
      pinia,
      stubs: {
        RouterView: {
          template: '<div id="router-view-stub"></div>',
        },
      },
      mocks: {
        $router: {
          push: routerPush,
        },
        $route: {
          name: routeName,
        },
      },
    });

    mainStore = useMainStore(pinia);
    dockerStore = useDockerStore(pinia);
    workflowStore = useWorkflowStore(pinia);
    healthStore = useHealthCheckStore(pinia);

    verifyDockerImageSpy = jest.spyOn(dockerStore, 'verifyDockerImage');
    notifyAppReadySpy = jest.spyOn(mainStore, 'notifyAppReady');
  };

  const findWorkflowHealthCheck = () => wrapper.findComponent(WorkflowHealthCheck);
  const findBreadcrumb = () => wrapper.findComponent(Breadcrumb);
  const findRouterView = () => wrapper.find('#router-view-stub');

  beforeEach(() => {
    createComponent();
  });

  describe('Duo Workflow App', () => {
    it('renders', () => {
      expect(wrapper.exists()).toBe(true);
    });

    describe('when DuoWorkflow is enabled', () => {
      beforeEach(() => {
        createComponent();
        dockerStore.status = DOCKER_STATES.IMAGE_PULLED;
        healthStore.isWorkflowEnabledForProject = true;
      });

      it('renders the router-view and breadcrumb component', () => {
        expect(findRouterView().exists()).toBe(true);
        expect(findBreadcrumb().exists()).toBe(true);
      });

      it('does not render the workflow-health-check component', () => {
        expect(findWorkflowHealthCheck().exists()).toBe(false);
      });
    });

    describe('when DuoWorkflow is disabled', () => {
      beforeEach(() => {
        createComponent();
        healthStore.isWorkflowEnabledForProject = false;
      });

      it('does not render the router-view component or breadcrumb', () => {
        expect(findRouterView().exists()).toBe(false);
        expect(findBreadcrumb().exists()).toBe(false);
      });

      it('renders the workflow-health-check component', () => {
        expect(findWorkflowHealthCheck().exists()).toBe(true);
      });
    });

    describe('docker image logic', () => {
      describe('when component is created', () => {
        it('sends a message to verify docker image', () => {
          expect(verifyDockerImageSpy).toHaveBeenCalledWith();
        });
      });
    });

    describe('appReady notification', () => {
      it('should send the appReady notification', () => {
        expect(notifyAppReadySpy).toHaveBeenCalled();
      });
    });

    describe('initialState notification', () => {
      it('should not route to WORKFLOW_NEW_APP when initialState has no goal', async () => {
        const initialState = { someOtherProp: 'value' };
        workflowStore.initialState = initialState;

        await nextTick();

        expect(routerPush).not.toHaveBeenCalled();
      });

      it('should route to WORKFLOW_NEW_APP when initialState has goal', async () => {
        const initialState = { goal: 'someGoal' };
        workflowStore.initialState = initialState;

        await nextTick();

        expect(routerPush).toHaveBeenCalledWith({
          name: WORKFLOW_NEW_APP,
        });
      });
    });

    describe('project path', () => {
      it('fetches project path when component is created', () => {
        expect(mainStore.getProjectPath).toHaveBeenCalled();
      });
    });
  });
});

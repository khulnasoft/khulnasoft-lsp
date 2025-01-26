import { createTestingPinia } from '@pinia/testing';
import { shallowMount } from '@vue/test-utils';
import { useWorkflowStore } from '../../stores/workflow';
import { useMainStore } from '../../stores/main';
import { useRequestErrorStore } from '../../stores/request_error';
import { WORKFLOW_SHOW_APP } from '../../router/constants';
import ErrorNotifications from '../../common/error_notifications.vue';
import WorkflowNew from './workflow_new.vue';
import DuoWorkflowPrompt from './components/duo_workflow_prompt.vue';

let wrapper;
let workflowStore;
let mainStore;
let startWorkflowSpy;
let routerPushSpy;
let requestErrorStore;
const createComponent = () => {
  const pinia = createTestingPinia({
    stubActions: false,
  });

  routerPushSpy = jest.fn();

  wrapper = shallowMount(WorkflowNew, {
    pinia,
    stubs: {
      ErrorNotifications,
    },
    mocks: {
      $router: {
        push: routerPushSpy,
      },
    },
  });

  workflowStore = useWorkflowStore();
  mainStore = useMainStore();
  requestErrorStore = useRequestErrorStore();

  startWorkflowSpy = jest.spyOn(workflowStore, 'startWorkflow');
};

const findWorkflowPrompt = () => wrapper.findComponent(DuoWorkflowPrompt);
const findErrorNotifications = () => wrapper.findComponent(ErrorNotifications);

describe('New Workflow vue application', () => {
  beforeEach(() => {
    createComponent();
  });

  it('should render the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('should render the workflow prompt component', () => {
    expect(findWorkflowPrompt().exists()).toBe(true);
  });
});

describe('when submitting a goal', () => {
  beforeEach(() => {
    createComponent();
    findWorkflowPrompt().vm.$emit('start-workflow');
  });

  it('should start the workflow', () => {
    expect(startWorkflowSpy).toHaveBeenCalled();
  });

  it('should pass down the isCreatingWorkflow prop as true', () => {
    expect(findWorkflowPrompt().props('isCreatingWorkflow')).toBe(true);
  });

  describe('and there is a request error', () => {
    beforeEach(() => {
      requestErrorStore.setRequestError('Problem with loading workflow');
    });

    it('should revert isCreatingWorkflow back to false', async () => {
      expect(findWorkflowPrompt().props('isCreatingWorkflow')).toBe(false);
    });

    it('should render the error message', async () => {
      expect(findErrorNotifications().exists()).toBe(true);
      expect(findErrorNotifications().text()).toContain('Problem with loading workflow');
    });
  });

  describe('when the workflow has an initialState goal set', () => {
    beforeEach(() => {
      createComponent();
      workflowStore.initialState = { goal: 'Test Goal' };
    });
    it('should set isCreatingWorkflow to true', () => {
      expect(findWorkflowPrompt().props('isCreatingWorkflow')).toBe(true);
    });

    it('should not redirect to the workflow show page', () => {
      expect(routerPushSpy).not.toHaveBeenCalled();
    });
  });

  describe('when the workflow ID is set', () => {
    beforeEach(() => {
      createComponent();
      workflowStore.activeWorkflow.id = 1;
    });

    it('should redirect to the workflow show page', () => {
      expect(routerPushSpy).toHaveBeenCalledWith({
        name: WORKFLOW_SHOW_APP,
        params: { workflowId: 1 },
      });
    });

    it('should set isCreatingWorkflow to false`', () => {
      expect(findWorkflowPrompt().props('isCreatingWorkflow')).toBe(false);
    });
  });

  describe('on open url', () => {
    beforeEach(() => {
      findWorkflowPrompt().vm.$emit('open-url', 'https://gitlab.com');
    });

    it('should call the openUrl pinia action', () => {
      expect(mainStore.openUrl).toHaveBeenCalledWith('https://gitlab.com');
    });
  });
});

import { GlAlert } from '@khulnasoft/ui';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowStore } from '../../stores/workflow';
import { useRequestErrorStore } from '../../stores/request_error';
import ErrorNotifications from '../../common/error_notifications.vue';
import WorkflowShow from './workflow_show.vue';
import DuoWorkflowExecution from './components/duo_workflow_execution.vue';

describe('WorkflowShow', () => {
  let wrapper;
  let workflowStore;
  let requestErrorStore;

  const createComponent = (options = {}) => {
    const pinia = createTestingPinia({
      stubActions: false,
    });

    wrapper = shallowMount(WorkflowShow, {
      pinia,
      stubs: {
        ErrorNotifications,
      },
      mocks: {
        $route: {
          params: { workflowId: '1' },
        },
      },
      ...options,
    });

    workflowStore = useWorkflowStore();
    requestErrorStore = useRequestErrorStore();
  };

  const findErrorNotifications = () => wrapper.findComponent(GlAlert);

  beforeEach(() => {
    createComponent();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders ErrorNotifications component', () => {
    expect(wrapper.findComponent(ErrorNotifications).exists()).toBe(true);
  });

  it('renders DuoWorkflowExecution component', () => {
    expect(wrapper.findComponent(DuoWorkflowExecution).exists()).toBe(true);
  });

  it('calls getWorkflowById on created', () => {
    expect(workflowStore.getWorkflowById).toHaveBeenCalledWith('1');
  });

  it('passes correct props to DuoWorkflowExecution', () => {
    const executionComponent = wrapper.findComponent(DuoWorkflowExecution);
    expect(executionComponent.props('checkpoint')).toBe(workflowStore.workflowCheckpoint);
    expect(executionComponent.props('status')).toBe(workflowStore.workflowStatus);
  });

  it('calls sendWorkflowEvent when DuoWorkflowExecution emits send-workflow-event', async () => {
    const executionComponent = wrapper.findComponent(DuoWorkflowExecution);

    await executionComponent.vm.$emit('send-workflow-event', { eventType: 'event', message: '' });

    expect(workflowStore.sendWorkflowEvent).toHaveBeenCalledWith('event', '');
  });

  describe('on error', () => {
    beforeEach(() => {
      createComponent();
      workflowStore.setWorkflowLoading = jest.fn();
      requestErrorStore.setRequestError('Problem with loading workflow');
    });

    it('sets workflowLoading to false', () => {
      expect(workflowStore.setWorkflowLoading).toHaveBeenCalledWith(false);
    });

    it('renders error message', () => {
      expect(findErrorNotifications().exists()).toBe(true);
      expect(findErrorNotifications().text()).toBe('Problem with loading workflow');
    });
  });
});

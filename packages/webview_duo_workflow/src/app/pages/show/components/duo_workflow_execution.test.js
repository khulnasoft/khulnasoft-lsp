import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { WORKFLOW_SET_GOAL } from '../../../constants.ts';
import { useWorkflowStore } from '../../../stores/workflow';
import { WorkflowEvent } from '../../../../common/duo_workflow_events.ts';
import DuoWorkflowChat from './duo_workflow_chat.vue';
import DuoWorkflowExecution from './duo_workflow_execution.vue';

describe('DuoWorkflowExecution', () => {
  let wrapper;
  let workflowStore;

  const toastMock = jest.fn();

  const createComponent = (props = {}) => {
    const pinia = createTestingPinia({
      stubActions: false,
    });

    wrapper = shallowMount(DuoWorkflowExecution, {
      pinia,
      propsData: {
        checkpoint: {},
        status: '',
        step: WORKFLOW_SET_GOAL,
        ...props,
      },
      directives: {
        'gl-tooltip': jest.fn(),
      },
      mocks: {
        $toast: {
          show: toastMock,
        },
      },
      // eslint-disable-next-line no-undef
      attachTo: document.body,
    });

    workflowStore = useWorkflowStore();
  };

  const findLoadingIcon = () => wrapper.find('[data-testid="loading-icon"]');
  const findRunningStatusIcon = () => wrapper.find('[data-testid="running-status-icon"]');
  const findStatusIcon = () => wrapper.find('[data-testid="status-icon"]');

  const findPauseButton = () => wrapper.find('[data-testid="toggle-pause-button"]');
  const findStopButton = () => wrapper.find('[data-testid="stop-button"]');
  const findStopModal = () => wrapper.findComponent({ name: 'GlModal' });

  const findGoal = () => wrapper.find('[data-testid="goal"]');
  const findGoalLoader = () => wrapper.find('[data-testid="goal-skeleton-loader"]');
  const findDuoChat = () => wrapper.findComponent(DuoWorkflowChat);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic render', () => {
    beforeEach(() => {
      createComponent({ status: 'RUNNING' });
      const goalText = 'Test Goal';
      workflowStore.setWorkflowGoal(goalText);
    });

    it('renders the component', () => {
      expect(wrapper.exists()).toBe(true);
    });

    it('renders the goal', () => {
      expect(findGoal().text()).toContain('Test Goal');
      expect(findGoalLoader().exists()).toBe(false);
    });

    it('renders the chat', () => {
      expect(findDuoChat().exists()).toBe(true);
    });
  });

  describe('when loading the workflow', () => {
    beforeEach(() => {
      createComponent();
      workflowStore.setWorkflowLoading(true);
    });

    it('renders the loading icon', () => {
      expect(findLoadingIcon().exists()).toBe(true);
      expect(findRunningStatusIcon().exists()).toBe(false);
      expect(findStatusIcon().exists()).toBe(false);
    });

    it('renders the skeleton loader in place of goal', () => {
      expect(findGoal().exists()).toBe(false);

      expect(findGoalLoader().exists()).toBe(true);
    });
  });

  describe('Statuses', () => {
    describe.each`
      status        | headerIcon        | statusText    | showActions | iconFinder
      ${'CREATED'}  | ${'spinner'}      | ${'Created'}  | ${true}     | ${findStatusIcon}
      ${'RUNNING'}  | ${undefined}      | ${'Running'}  | ${true}     | ${findRunningStatusIcon}
      ${''}         | ${'play'}         | ${''}         | ${false}    | ${findStatusIcon}
      ${'PAUSED'}   | ${'pause'}        | ${'Paused'}   | ${true}     | ${findStatusIcon}
      ${'FINISHED'} | ${'check-circle'} | ${'Complete'} | ${false}    | ${findStatusIcon}
      ${'FAILED'}   | ${'error'}        | ${'Failed'}   | ${false}    | ${findStatusIcon}
      ${'STOPPED'}  | ${'stop'}         | ${'Stopped'}  | ${false}    | ${findStatusIcon}
    `('when status is "$status"', ({ showActions, status, headerIcon, iconFinder, statusText }) => {
      beforeEach(() => {
        createComponent({ status });
      });

      it('display the correct headerIcon and statusText', () => {
        expect(iconFinder().exists()).toBe(true);
        expect(iconFinder().props('name')).toBe(headerIcon);
        expect(wrapper.html()).toContain(statusText);
      });

      it(`${showActions ? 'display' : 'does not display'} the action buttons`, () => {
        expect(findPauseButton().exists()).toBe(showActions);
        expect(findStopButton().exists()).toBe(showActions);
      });
    });
  });

  describe('Toggle Pause actions', () => {
    describe.each`
      buttonFinder       | transitionText   | toastMessage                                            | eventParams                | startingStatus
      ${findPauseButton} | ${'Pausing...'}  | ${'Execution pauses after the current task completes.'} | ${{ eventType: 'pause' }}  | ${'RUNNING'}
      ${findPauseButton} | ${'Resuming...'} | ${'Execution will resume shortly.'}                     | ${{ eventType: 'resume' }} | ${'PAUSED'}
    `(
      'when $transitionText',
      ({ transitionText, toastMessage, eventParams, buttonFinder, startingStatus }) => {
        beforeEach(() => {
          createComponent({ status: startingStatus });
          buttonFinder().vm.$emit('click');
        });

        it('displays the transition text', () => {
          expect(wrapper.html()).toContain(transitionText);
        });

        it('disables the action buttons', () => {
          expect(findPauseButton().props().disabled).toBe(true);
          expect(findStopButton().props().disabled).toBe(true);
        });

        it('emits the send-workflow-event event', () => {
          expect(wrapper.emitted('send-workflow-event')).toBeTruthy();
          expect(wrapper.emitted('send-workflow-event')[0]).toEqual([eventParams]);
        });

        it('displays the correct toast message', () => {
          expect(toastMock).toHaveBeenCalledWith(toastMessage);
        });
      },
    );
  });

  describe('Stop action', () => {
    beforeEach(() => {
      createComponent({ status: 'RUNNING' });
      findStopButton().vm.$emit('click');
    });

    it('opens the stop modal', () => {
      expect(findStopModal().props().modalId).toBe('stop-workflow-modal');
    });

    describe('when the stop action is cancelled', () => {
      beforeEach(() => {
        findStopModal().vm.$emit('secondary');
      });

      it('closes the modal', () => {
        expect(findStopModal().props().visible).toBe(false);
      });

      it('did not emit the send-workflow-event event', () => {
        expect(wrapper.emitted('send-workflow-event')).toBeUndefined();
      });

      it('did not show any toast message', () => {
        expect(toastMock).not.toHaveBeenCalled();
      });

      it('did not change the status text', () => {
        expect(wrapper.html()).toContain('Running');
      });
    });

    describe('when the stop action is confirmed', () => {
      beforeEach(() => {
        findStopModal().vm.$emit('primary');
      });
      it('displays the transition text', () => {
        expect(wrapper.html()).toContain('Stopping...');
      });

      it('disables the action buttons', () => {
        expect(findPauseButton().props().disabled).toBe(true);
        expect(findStopButton().props().disabled).toBe(true);
      });

      it('emits the send-workflow-event event', () => {
        expect(wrapper.emitted('send-workflow-event')).toBeTruthy();
        expect(wrapper.emitted('send-workflow-event')[0]).toEqual([
          {
            eventType: WorkflowEvent.STOP,
          },
        ]);
      });
      it('displays the correct toast message', () => {
        expect(toastMock).toHaveBeenCalledWith('Workflow stops after the current task completes.');
      });
    });
  });
});

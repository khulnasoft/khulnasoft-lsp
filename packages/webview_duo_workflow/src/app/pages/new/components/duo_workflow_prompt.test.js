import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { shallowMount, mount } from '@vue/test-utils';
import { GlFormTextarea } from '@khulnasoft/ui';
import { useWorkflowStore } from '../../../stores/workflow';
import { WORKFLOW_INDEX_APP } from '../../../router/constants';
import DuoWorkflowPrompt from './duo_workflow_prompt.vue';
import QuickActions from './quick_actions.vue';

describe('DuoWorkflowPrompt', () => {
  let wrapper;
  let workflowStore;

  const routerPushSpy = jest.fn();

  const createComponent = ({ props = {}, mountFn = shallowMount, store = {} } = {}) => {
    wrapper = mountFn(DuoWorkflowPrompt, {
      propsData: {
        isCreatingWorkflow: false,
        ...props,
      },
      mocks: {
        $router: {
          push: routerPushSpy,
        },
      },
      pinia: createTestingPinia({ stubActions: false }),
    });

    workflowStore = useWorkflowStore();

    workflowStore.activeWorkflow.goal = store?.goal || '';

    return nextTick();
  };

  const findPromptTextarea = () => wrapper.findComponent(GlFormTextarea);
  const findRunWorkflowButton = () => wrapper.find('[data-testid="start-workflow-button"]');
  const findCancelButton = () => wrapper.find('[data-testid="cancel-workflow-button"]');
  const findQuickActions = () => wrapper.findComponent(QuickActions);

  beforeEach(() => {
    createComponent();
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the legal disclaimer', () => {
    expect(wrapper.text()).toContain('This AI feature autonomously changes code.');
  });

  describe('quick actions', () => {
    it('renders the quick actions component', () => {
      expect(findQuickActions().exists()).toBe(true);
    });

    describe('when the prompt is not empty', () => {
      beforeEach(() => {
        createComponent();
        workflowStore.activeWorkflow.goal = 'A long prompt that is valid';
      });

      it('disables the quick actions', () => {
        expect(findQuickActions().props('disabled')).toBe(true);
      });
    });

    describe('when the prompt is empty', () => {
      beforeEach(() => {
        workflowStore.activeWorkflow.goal = '';
        createComponent({ props: { isCreatingWorkflow: false } });
      });

      it('enables the quick actions', () => {
        expect(findQuickActions().props('disabled')).toBe(false);
      });
    });

    describe('on quick actions', () => {
      it('updates the workflow goal', async () => {
        findQuickActions().vm.$emit('update-workflow-goal', 'fix bug');

        expect(workflowStore.activeWorkflow.goal).toBe('fix bug');
      });
    });
  });

  describe('when clicking the run workflow button', () => {
    beforeEach(() => {
      workflowStore.activeWorkflow.goal = 'test';
      findRunWorkflowButton().vm.$emit('click');
    });

    it('emits the start event', () => {
      expect(wrapper.emitted('start-workflow')).toEqual([[]]);
    });
  });

  describe('when clicking the cancel button', () => {
    beforeEach(() => {
      createComponent();
      findCancelButton().vm.$emit('click');
    });

    it('navigates to the workflow index page', () => {
      expect(routerPushSpy).toHaveBeenCalledWith({ name: WORKFLOW_INDEX_APP });
    });
  });

  describe('when workflow is being created', () => {
    beforeEach(() => {
      createComponent({ props: { isCreatingWorkflow: true } });
    });

    it('disables the run workflow button and show it loading', () => {
      expect(findRunWorkflowButton().props('loading')).toBe(true);
    });

    it('disabled the cancel button', () => {
      expect(findCancelButton().attributes('disabled')).toBe('true');
    });
  });
  describe('prompt textarea', () => {
    it('is valid when character count is <= 4096', async () => {
      const goal = new Array(4096).fill('a').join('');
      await createComponent({ store: { goal } });

      expect(findPromptTextarea().attributes('state')).toBe('true');
    });

    it('is invalid when character count is > 4096', async () => {
      const goal = new Array(4097).fill('a').join('');
      await createComponent({ store: { goal } });

      expect(findPromptTextarea().attributes('state')).toBeUndefined();
    });

    it('shows helper text when <= 100 characters remain', async () => {
      const goal = new Array(3996).fill('a').join('');
      await createComponent({ store: { goal }, mountFn: mount });

      expect(findPromptTextarea().text()).toContain('100 character(s) remaining.');
    });

    it('shows helper text when over limit', async () => {
      const goal = new Array(4097).fill('a').join('');
      await createComponent({ store: { goal }, mountFn: mount });

      expect(findPromptTextarea().text()).toContain('1 character(s) over limit.');
    });

    it('disables the run workflow button when over 4096 characters', async () => {
      const goal = new Array(4097).fill('a').join('');
      await createComponent({ store: { goal } });

      expect(findRunWorkflowButton().attributes('disabled')).toBeTruthy();
    });
  });
});

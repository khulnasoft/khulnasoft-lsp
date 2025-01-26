import { shallowMount } from '@vue/test-utils';
import { GlButton } from '@khulnasoft/ui';
import QuickActions from './quick_actions.vue';

describe('QuickActions', () => {
  let wrapper;

  const createComponent = ({ propsData } = {}) => {
    wrapper = shallowMount(QuickActions, {
      propsData: {
        disabled: false,
        ...propsData,
      },
    });
  };

  beforeEach(() => {
    createComponent();
  });

  const findCreateCodeButton = () => wrapper.findAllComponents(GlButton).at(0);
  const findFixBugButton = () => wrapper.findAllComponents(GlButton).at(1);

  it('renders "Create code for..." button', () => {
    const createCodeButton = findCreateCodeButton();

    expect(createCodeButton.text()).toBe('Create code for...');
    expect(createCodeButton.props('icon')).toBe('plus-square-o');
  });

  it('renders "Fix Bug..." button', () => {
    const fixBugButton = findFixBugButton();

    expect(fixBugButton.text()).toBe('Fix bug...');
    expect(fixBugButton.props('icon')).toBe('bug');
  });

  it('emits the "update-workflow-goal" event when "Create code for..." button is clicked', () => {
    findCreateCodeButton().vm.$emit('click');

    expect(wrapper.emitted('update-workflow-goal')).toEqual([['Create code for ']]);
  });

  it('emits the "update-workflow-goal" event when "Fix Bug..." button is clicked', () => {
    findFixBugButton().vm.$emit('click');

    expect(wrapper.emitted('update-workflow-goal')).toEqual([['Fix bug ']]);
  });

  describe('when button is disabled', () => {
    beforeEach(() => {
      createComponent({ propsData: { disabled: true } });
    });

    it('disables "Create code for..." button', () => {
      expect(findCreateCodeButton().props('disabled')).toBe(true);
    });

    it('disables "Fix Bug..." button', () => {
      expect(findFixBugButton().props('disabled')).toBe(true);
    });
  });
});

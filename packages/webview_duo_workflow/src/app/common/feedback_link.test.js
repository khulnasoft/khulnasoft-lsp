import { shallowMount } from '@vue/test-utils';
import { GlButton } from '@khulnasoft/ui';
import { createTestingPinia } from '@pinia/testing';
import { useMainStore } from '../stores/main';
import FeedbackLink from './feedback_link.vue';

describe('FeedbackLink', () => {
  let wrapper;
  let mainStore;

  const createComponent = () => {
    const pinia = createTestingPinia();

    wrapper = shallowMount(FeedbackLink, {
      global: {
        plugins: [pinia],
      },
    });

    mainStore = useMainStore();
    mainStore.openUrl = jest.fn();
  };

  const findLink = () => wrapper.findComponent(GlButton);

  beforeEach(() => {
    createComponent();
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the correct text', () => {
    expect(wrapper.text()).toContain('Give feedback');
  });

  it('renders the thumb-up icon', () => {
    expect(findLink().props('icon')).toBe('thumb-up');
  });

  it('calls openUrl method when clicked', async () => {
    await findLink().vm.$emit('click');

    expect(mainStore.openUrl).toHaveBeenCalledWith(
      'https://gitlab.fra1.qualtrics.com/jfe/form/SV_9GmCPTV7oH9KNuu',
    );
  });

  it('prevents default event when clicked', async () => {
    const preventDefault = jest.fn();
    await findLink().vm.$emit('click', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
  });
});

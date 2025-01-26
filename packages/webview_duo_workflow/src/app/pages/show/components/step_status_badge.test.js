import { shallowMount } from '@vue/test-utils';
import { GlIcon } from '@khulnasoft/ui';
import StepStatusBadge from './step_status_badge.vue';

describe('StepStatusBadge', () => {
  let wrapper;

  const createWrapper = (status) => {
    wrapper = shallowMount(StepStatusBadge, {
      propsData: {
        status,
      },
    });
  };

  const findIcon = () => wrapper.findComponent(GlIcon);

  it.each`
    status           | variant      | icon
    ${'Not Started'} | ${'subtle'}  | ${'status-waiting'}
    ${'In Progress'} | ${'info'}    | ${'status-running'}
    ${'Paused'}      | ${'subtle'}  | ${'status-paused'}
    ${'Completed'}   | ${'success'} | ${'status-success'}
    ${'Cancelled'}   | ${'danger'}  | ${'status-cancelled'}
    ${'Unknown'}     | ${'subtle'}  | ${'status-waiting'}
  `('renders the correct icon and variant for status: $status', ({ status, variant, icon }) => {
    createWrapper(status);
    expect(findIcon().props()).toEqual(
      expect.objectContaining({
        name: icon,
        variant,
        size: 14,
      }),
    );
  });
});

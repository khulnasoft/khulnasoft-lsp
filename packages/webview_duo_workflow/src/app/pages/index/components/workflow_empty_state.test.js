import { shallowMount } from '@vue/test-utils';
import { GlEmptyState } from '@khulnasoft/ui';
import WorkflowEmptyState from './workflow_empty_state.vue';

describe('WorkflowEmptyState', () => {
  let wrapper;

  const createComponent = () => {
    wrapper = shallowMount(WorkflowEmptyState, {});
  };

  beforeEach(() => {
    createComponent();
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders GlEmptyState component', () => {
    expect(wrapper.findComponent(GlEmptyState).exists()).toBe(true);
  });

  it('renders the correct title', () => {
    const title = wrapper.find('h1');
    expect(title.text()).toBe('Improve your workflow with KhulnaSoft Duo');
  });

  it('renders the correct description', () => {
    expect(wrapper.html()).toContain('Get started with AI-powered KhulnaSoft Duo Workflow.');
    expect(wrapper.html()).toContain("You haven't created a workflow in this project yet.");
  });
});

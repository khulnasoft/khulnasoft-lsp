import { GlKeysetPagination, GlTableLite } from '@khulnasoft/ui';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { useWorkflowStore } from '../../../stores/workflow';
import { useMainStore } from '../../../stores/main';
import { getIDfromGraphqlId } from '../../../utils.ts';
import { formatTimeAgo } from '../../../utils/time_utils';
import { WORKFLOW_SHOW_APP } from '../../../router/constants';
import WorkflowTable from './workflow_table.vue';

describe('WorkflowTable', () => {
  let wrapper;
  let workflowStore;
  let mainStore;

  const mockGetUserWorkflows = jest.fn();

  const mockWorkflows = [
    {
      id: 'gid://gitlab/DuoWorkflow/1',
      goal: 'Goal 1',
      projectId: 'project1',
      humanStatus: 'RUNNING',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-02',
    },
    {
      id: 'gid://gitlab/DuoWorkflow/2',
      goal: 'Goal 2',
      projectId: 'project2',
      humanStatus: 'FINISHED',
      createdAt: '2023-01-03',
      updatedAt: '2023-01-04',
    },
  ];
  const createComponent = ({ props = {} } = {}) => {
    wrapper = mount(WorkflowTable, {
      propsData: {
        workflows: mockWorkflows,
        ...props,
      },
      pinia: createTestingPinia(),
      stubs: {
        GlKeysetPagination: true,
      },
    });

    workflowStore = useWorkflowStore();
    mainStore = useMainStore();
  };

  const findTable = () => wrapper.findComponent(GlTableLite);
  const findKeyset = () => wrapper.findComponent(GlKeysetPagination);

  beforeEach(() => {
    createComponent();

    mainStore.projectPath = 'project';
    workflowStore.getUserWorkflows = mockGetUserWorkflows;
    workflowStore.workflowsPageInfo = {};
  });

  it('renders ID and Goal of workflows in the table', () => {
    expect(findTable().exists()).toBe(true);

    mockWorkflows.forEach((workflow) => {
      expect(findTable().html()).toContain(getIDfromGraphqlId(workflow.id));
      expect(findTable().html()).toContain(workflow.goal);
    });
  });

  it('renders the relative time for last update', () => {
    expect(findTable().html()).toContain(formatTimeAgo(mockWorkflows[0].updatedAt));
  });

  it('renders the statuses', () => {
    expect(findTable().html()).toContain('Running');
    expect(findTable().html()).toContain('Complete');
  });

  it('adds link to the workflow goal', () => {
    const workflowIds = mockWorkflows.map((workflow) => getIDfromGraphqlId(workflow.id));
    const workflowGoalsLinks = wrapper.findAll('[data-testid="workflow-goal-link"]');

    expect(workflowGoalsLinks.length).toBe(workflowIds.length);

    workflowGoalsLinks.wrappers.forEach((link, index) => {
      expect(JSON.parse(link.attributes('data-test'))).toEqual({
        name: WORKFLOW_SHOW_APP,
        params: { workflowId: workflowIds[index] },
      });
    });
  });

  describe('pagination', () => {
    it('renders the prev and next button', () => {
      expect(findKeyset().exists()).toBe(true);
    });

    describe('when clicking on next', () => {
      beforeEach(() => {
        findKeyset().vm.$emit('next');
      });

      it('calls getUserWorkflows with the startCursor', () => {
        expect(mockGetUserWorkflows).toHaveBeenCalledWith({
          projectPath: mainStore.projectPath,
          before: workflowStore.workflowsPageInfo.startCursor,
        });
      });
    });

    describe('when clicking on prev', () => {
      beforeEach(() => {
        findKeyset().vm.$emit('prev');
      });

      it('calls getUserWorkflows with the endCursor', () => {
        expect(mockGetUserWorkflows).toHaveBeenCalledWith({
          projectPath: mainStore.projectPath,
          after: workflowStore.workflowsPageInfo.endCursor,
        });
      });
    });
  });
});

import { GlLoadingIcon } from '@khulnasoft/ui';
import { createTestingPinia } from '@pinia/testing';
import { shallowMount } from '@vue/test-utils';
import { useMainStore } from '../../stores/main';
import { useWorkflowStore } from '../../stores/workflow';
import ProjectPath from '../../common/project_path.vue';
import WorkflowIndex from './workflow_index.vue';
import WorkflowTable from './components/workflow_table.vue';
import WorkflowEmptyState from './components/workflow_empty_state.vue';

let wrapper;
let mainStore;
let workflowStore;

const workflows = [
  {
    id: '1',
    goal: 'Test Goal 1',
    projectId: 'project1',
    humanStatus: 'ACTIVE',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-02',
  },
  {
    id: '2',
    goal: 'Test Goal 2',
    projectId: 'project2',
    humanStatus: 'COMPLETED',
    createdAt: '2023-01-03',
    updatedAt: '2023-01-04',
  },
];

const createComponent = () => {
  wrapper = shallowMount(WorkflowIndex, {
    pinia: createTestingPinia(),
  });

  workflowStore = useWorkflowStore();
  mainStore = useMainStore();
};

const findEmptyState = () => wrapper.findComponent(WorkflowEmptyState);
const findLoadingIcon = () => wrapper.findComponent(GlLoadingIcon);
const findWorkflowsTable = () => wrapper.findComponent(WorkflowTable);
const findProjectPath = () => wrapper.findComponent(ProjectPath);

beforeEach(() => {
  createComponent();
});

describe('WorkflowIndex vue component', () => {
  describe('default state', () => {
    it('renders the component', () => {
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('loading states', () => {
    describe.each`
      areWorkflowLoading | isLoadingProjectPath | isLoadingHealthCheck | expectedResult
      ${true}            | ${true}              | ${true}              | ${true}
      ${true}            | ${false}             | ${false}             | ${true}
      ${false}           | ${false}             | ${false}             | ${false}
    `(
      'when areWorkflowLoading is $areWorkflowLoading, isLoadingProjectPath is $isLoadingProjectPath, isLoadingHealthCheck is $isLoadingHealthCheck',
      ({ areWorkflowLoading, isLoadingProjectPath, isLoadingHealthCheck, expectedResult }) => {
        beforeEach(() => {
          workflowStore.areWorkflowsLoading = areWorkflowLoading;
          mainStore.isLoadingProjectPath = isLoadingProjectPath;
          mainStore.isLoadingHealthCheck = isLoadingHealthCheck;
          workflowStore.workflows = workflows;
        });

        it(`${expectedResult ? 'displays' : 'does not display'} the loading icon`, () => {
          expect(findLoadingIcon().exists()).toBe(expectedResult);
        });

        it(`${expectedResult ? 'does not display' : 'displays'} the table`, () => {
          expect(findWorkflowsTable().exists()).toBe(!expectedResult);
        });
      },
    );
  });

  describe('when workflows have loaded', () => {
    beforeEach(async () => {
      workflowStore.areWorkflowsLoading = false;
      workflowStore.workflows = workflows;
    });

    describe('if there is no projectPath', () => {
      beforeEach(() => {
        mainStore.projectPath = '';
      });

      it('does not show the projectPath', () => {
        expect(wrapper.text()).not.toContain('Current project:');
      });

      it('does not call getUserWorkflows', () => {
        const getUserWorkflowsSpy = jest.spyOn(workflowStore, 'getUserWorkflows');
        expect(getUserWorkflowsSpy).not.toHaveBeenCalled();
      });
    });

    describe('if projectPath is available', () => {
      beforeEach(async () => {
        mainStore.projectPath = 'test-project';
      });

      it('shows the projectPath', () => {
        expect(findProjectPath().exists()).toBe(true);
      });

      it('calls getUserWorkflows with the projectPath', () => {
        const getUserWorkflowsSpy = jest.spyOn(workflowStore, 'getUserWorkflows');
        expect(getUserWorkflowsSpy).toHaveBeenCalledWith({ projectPath: 'test-project' });
      });
    });

    describe('empty state', () => {
      describe('when workflows are loading', () => {
        beforeEach(async () => {
          workflowStore.areWorkflowsLoading = true;
        });
        it('does not render the empty state', () => {
          expect(findEmptyState().exists()).toBe(false);
        });
      });

      describe('when workflows have loaded', () => {
        beforeEach(async () => {
          workflowStore.areWorkflowsLoading = false;
        });

        describe('and there are workflows', () => {
          beforeEach(async () => {
            workflowStore.workflows = workflows;
          });

          it('does not render the empty state', () => {
            expect(findEmptyState().exists()).toBe(false);
          });
        });

        describe('and there are no workflows', () => {
          beforeEach(async () => {
            workflowStore.areWorkflowsLoading = false;
            workflowStore.workflows = [];
          });

          it('renders the empty state', () => {
            expect(findEmptyState().exists()).toBe(true);
          });
        });
      });
    });

    it('renders the table and passes the workflows props', () => {
      expect(findWorkflowsTable().exists()).toBe(true);
      expect(findWorkflowsTable().props().workflows).toEqual(workflows);
    });
  });

  describe('when projectPath changes', () => {
    beforeEach(() => {
      mainStore.projectPath = 'test-project';
    });

    it('calls getUserWorkflows with the new projectPath', () => {
      const getUserWorkflowsSpy = jest.spyOn(workflowStore, 'getUserWorkflows');
      expect(getUserWorkflowsSpy).toHaveBeenCalledWith({ projectPath: mainStore.projectPath });
    });
  });
});

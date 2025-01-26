import { setActivePinia, createPinia } from 'pinia';
import * as bridgeModule from '../../common/bridge';
import { DEFAULT_DOCKER_IMAGE } from '../constants.ts';
import { GET_USER_WORKFLOWS } from '../graphql/queries';
import { useWorkflowStore } from './workflow';
import { useHealthCheckStore } from './health_check';
import { useMainStore } from './main';

describe('Workflow Store', () => {
  let workflowStore;
  let healthStore;
  let mainStore;

  const defaultPayload = {
    projectPath: 'project/path',
    after: null,
    first: 20,
    last: null,
    before: null,
  };

  const mockSendRequest = jest.fn();
  const mockGraphqlRequest = jest.fn();

  beforeEach(() => {
    jest.spyOn(bridgeModule, 'sendRequest').mockImplementation(mockSendRequest);
    jest.spyOn(bridgeModule, 'sendGraphqlRequest').mockImplementation(mockGraphqlRequest);
    setActivePinia(createPinia());
    workflowStore = useWorkflowStore();
    healthStore = useHealthCheckStore();
    mainStore = useMainStore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    expect(workflowStore.workflows).toEqual([]);
    expect(workflowStore.areWorkflowsLoading).toBe(false);
  });

  describe('getUserWorkflows', () => {
    it('sets loading state and sends request to get workflows', () => {
      workflowStore.getUserWorkflows({ projectPath: 'project/path' });

      expect(workflowStore.areWorkflowsLoading).toBe(true);
      expect(mockGraphqlRequest).toHaveBeenCalledWith({
        eventName: 'updateWorkflows',
        variables: defaultPayload,
        query: GET_USER_WORKFLOWS,
      });
    });

    describe('count variable', () => {
      describe('when there is a before value', () => {
        beforeEach(() => {
          workflowStore.getUserWorkflows({ projectPath: 'project/path', before: 'startCursor' });
        });

        it('sets the first argument to 20', () => {
          expect(mockGraphqlRequest).toHaveBeenCalledWith({
            eventName: 'updateWorkflows',
            variables: {
              ...defaultPayload,
              first: null,
              last: 20,
              before: 'startCursor',
            },
            query: GET_USER_WORKFLOWS,
          });
        });
      });

      describe('when there is an after value', () => {
        beforeEach(() => {
          workflowStore.getUserWorkflows({ projectPath: 'project/path', after: 'endCursor' });
        });
        it('sets the last argument to 20', () => {
          expect(mockGraphqlRequest).toHaveBeenCalledWith({
            eventName: 'updateWorkflows',
            variables: {
              ...defaultPayload,
              first: 20,
              last: null,
              after: 'endCursor',
            },
            query: GET_USER_WORKFLOWS,
          });
        });
      });

      describe('when neither start nor end cursor is present', () => {
        beforeEach(() => {
          workflowStore.getUserWorkflows({ projectPath: 'project/path' });
        });

        it('sets the first argument to 20', () => {
          expect(mockGraphqlRequest).toHaveBeenCalledWith({
            eventName: 'updateWorkflows',
            variables: defaultPayload,
            query: GET_USER_WORKFLOWS,
          });
        });
      });
    });
  });

  describe('getWorkflowById', () => {
    it('sets loading state and sends request to get workflow by ID', () => {
      const workflowId = '123';
      workflowStore.getWorkflowById(workflowId);
    });
  });

  describe('resetActiveWorkflow', () => {
    it('resets the active workflow to its initial state', () => {
      workflowStore.activeWorkflow = {
        id: '123',
        goal: 'Test Goal',
        status: 'ACTIVE',
        checkpoint: { test: 'checkpoint' },
      };
      workflowStore.resetActiveWorkflow();
      expect(workflowStore.activeWorkflow).toEqual({
        id: '',
        goal: '',
        status: '',
        checkpoint: {},
      });
    });
  });

  describe('runWorkflow', () => {
    it('sends request to start the workflow with goal and image', () => {
      const dockerImage = 'test-image';
      workflowStore.activeWorkflow.goal = 'Test Goal';
      workflowStore.runWorkflow(dockerImage);
      expect(mockSendRequest).toHaveBeenCalledWith('startWorkflow', {
        goal: 'Test Goal',
        image: 'test-image',
      });
    });
    it('runs the workflow with the default docker image if none is provided', () => {
      workflowStore.activeWorkflow.goal = 'Test Goal';
      workflowStore.runWorkflow();
      expect(mockSendRequest).toHaveBeenCalledWith('startWorkflow', {
        goal: 'Test Goal',
        image: DEFAULT_DOCKER_IMAGE,
      });
    });
  });

  describe('sendWorkflowEvent', () => {
    it('sends request to send workflow event with eventType, workflowId, and message', () => {
      const eventType = 'TEST_EVENT';
      const message = 'Test Message';
      workflowStore.activeWorkflow = { id: '123' };
      workflowStore.sendWorkflowEvent(eventType, message);
      expect(mockSendRequest).toHaveBeenCalledWith('sendWorkflowEvent', {
        eventType,
        workflowId: '123',
        message,
      });
    });
  });

  describe('setWorkflowId', () => {
    it('sets the ID of the active workflow', () => {
      const workflowId = '456';
      workflowStore.setWorkflowId(workflowId);
      expect(workflowStore.activeWorkflow.id).toBe(workflowId);
    });
  });

  describe('setWorkflowCheckpoint', () => {
    it('sets the checkpoint of the active workflow', () => {
      const checkpoint = { test: 'checkpoint' };
      workflowStore.setWorkflowCheckpoint({ checkpoint });
      expect(workflowStore.activeWorkflow.checkpoint).toEqual(checkpoint);
    });
  });

  describe('setWorkflowGoal', () => {
    it('sets the goal of the active workflow', () => {
      const goal = 'Test Goal';
      workflowStore.setWorkflowGoal(goal);
      expect(workflowStore.activeWorkflow.goal).toBe(goal);
    });
  });

  describe('setWorkflowLoading', () => {
    it('sets the loading state of the active workflow', () => {
      workflowStore.setWorkflowLoading(true);

      expect(workflowStore.isLoadingWorkflow).toBe(true);
    });
  });

  describe('setWorkflowsLoading', () => {
    it('sets the loading state of the workflows', () => {
      const isLoading = true;
      workflowStore.setWorkflowsLoading(isLoading);
      expect(workflowStore.areWorkflowsLoading).toBe(isLoading);
    });
  });

  describe('setWorkflowStatus', () => {
    it('sets the status of the active workflow', () => {
      const status = 'ACTIVE';
      workflowStore.setWorkflowStatus(status);
      expect(workflowStore.activeWorkflow.status).toBe(status);
    });
    it('does not set the status of the active workflow if it is undefined', () => {
      const status = undefined;
      workflowStore.setWorkflowStatus(status);
      expect(workflowStore.activeWorkflow.status).toBe('');
    });
  });

  describe('startWorkflow', () => {
    it('send the runWorkflow event', () => {
      workflowStore.activeWorkflow.goal = 'Test Goal';
      const runWorkflowSpy = jest.spyOn(workflowStore, 'runWorkflow');

      workflowStore.startWorkflow();
      expect(runWorkflowSpy).toHaveBeenCalledWith();
    });
  });

  describe('stopWorkflow', () => {
    it('sends request to cancel the workflow with workflowId', () => {
      const workflowId = '123';
      workflowStore.activeWorkflow = { id: workflowId };
      workflowStore.stopWorkflow();
      expect(mockSendRequest).toHaveBeenCalledWith('cancelWorkflow', { workflowId });
    });
  });

  describe('onInitialState', () => {
    it('updates the store', () => {
      const mockInitialState = { goal: 'someValue' };
      workflowStore.onInitialState(mockInitialState);
      expect(workflowStore.initialState).toEqual(mockInitialState);
    });
    it('sets the initial goal of the workflow', () => {
      const mockInitialState = { goal: 'Test Goal' };
      workflowStore.onInitialState(mockInitialState);
      expect(workflowStore.workflowGoal).toBe(mockInitialState.goal);
    });
  });

  describe('updateWorkflows', () => {
    describe('when there are workflows', () => {
      it('updates workflows and stops loading', () => {
        const mockWorkflows = {
          duoWorkflowWorkflows: {
            edges: [
              { node: { id: '1', name: 'Workflow 1' } },
              { node: { id: '2', name: 'Workflow 2' } },
            ],
          },
        };

        workflowStore.updateWorkflows(mockWorkflows);

        expect(workflowStore.workflows).toEqual([
          { id: '1', name: 'Workflow 1' },
          { id: '2', name: 'Workflow 2' },
        ]);
        expect(workflowStore.areWorkflowsLoading).toBe(false);
      });
    });

    describe('when there are no workflows', () => {
      it('updates workflows to an empty array and stops loading', () => {
        const emptyWorkflows = [];
        workflowStore.updateWorkflows(emptyWorkflows);

        expect(workflowStore.workflows).toEqual([]);
        expect(workflowStore.areWorkflowsLoading).toBe(false);
      });

      describe('and the payload is correct', () => {
        beforeEach(() => {
          workflowStore.updateWorkflows([]);
          healthStore.getHealthChecks = jest.fn();
        });
        it('does not call the getHealthChecks method', () => {
          expect(healthStore.getHealthChecks).not.toHaveBeenCalled();
        });
      });

      describe('and the payload is incorrect', () => {
        beforeEach(() => {
          healthStore.getHealthChecks = jest.fn();
          workflowStore.updateWorkflows(null);
        });
        it('calls the getHealthChecks method', () => {
          expect(healthStore.getHealthChecks).toHaveBeenCalledWith(mainStore.projectPath);
        });
      });
    });
  });
});

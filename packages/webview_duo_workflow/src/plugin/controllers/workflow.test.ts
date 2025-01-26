import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import { DuoWorkflowEventConnection, DuoWorkflowStatus, DuoWorkflowStatusEvent } from '../../types';
import { parseWorkflowData } from '../utils';
import { initWorkflowController } from './workflow';
import { NO_REPLY } from './constants';

const runningCheckpoint: DuoWorkflowEventConnection = {
  duoWorkflowEvents: {
    nodes: [
      {
        checkpoint: JSON.stringify({
          channel_values: {
            status: 'Execution',
          },
        }),
        errors: [],
        metadata: 'test-metadata',
        workflowStatus: DuoWorkflowStatus.RUNNING,
        workflowGoal: 'Fix this',
      },
    ],
  },
};
const checkpointWithoutGoal: DuoWorkflowEventConnection = {
  duoWorkflowEvents: {
    nodes: [
      {
        checkpoint: JSON.stringify({
          channel_values: {
            status: 'Execution',
          },
        }),
        errors: [],
        metadata: 'test-metadata',
        workflowStatus: DuoWorkflowStatus.RUNNING,
        workflowGoal: '',
      },
    ],
  },
};

const expectedRunningCheckpoint = parseWorkflowData(runningCheckpoint);

describe('WorkflowController', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let workflowController: any;
  let mockWorkflowApi: jest.Mocked<WorkflowAPI>;
  let mockSubCallback;

  beforeEach(() => {
    mockSubCallback = jest.fn();
    mockWorkflowApi = {
      getGraphqlData: jest.fn(),
      disconnectCable: jest.fn(),
      runWorkflow: jest.fn(),
      subscribeToUpdates: jest.fn(),
      sendEvent: jest.fn(),
      watchWorkflowExecutor: jest.fn().mockResolvedValue({ StatusCode: 0 }),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<WorkflowAPI>;

    workflowController = initWorkflowController(mockWorkflowApi, mockSubCallback);
  });

  describe('getWorkflowById', () => {
    describe('when the workflow is fetched successfully', () => {
      beforeEach(() => {
        mockWorkflowApi.getGraphqlData.mockResolvedValue(runningCheckpoint);
      });

      it('returns the expected payload', async () => {
        const results = await workflowController.getWorkflowById({ workflowId: '1' });
        expect(results).toEqual([
          { eventName: 'workflowStarted', data: '1' },
          { eventName: 'workflowCheckpoint', data: expectedRunningCheckpoint },
          { eventName: 'workflowStatus', data: DuoWorkflowStatus.RUNNING },
          { eventName: 'workflowGoal', data: 'Fix this' },
        ]);
      });
    });

    describe('when the goal is empty', () => {
      beforeEach(() => {
        mockWorkflowApi.getGraphqlData.mockResolvedValue(checkpointWithoutGoal);
      });
      it('returns the expected payload without the goal', async () => {
        const results = await workflowController.getWorkflowById({ workflowId: '1' });
        expect(results).toEqual([
          { eventName: 'workflowStarted', data: '1' },
          { eventName: 'workflowCheckpoint', data: parseWorkflowData(checkpointWithoutGoal) },
          {
            eventName: 'workflowStatus',
            data: DuoWorkflowStatus.RUNNING,
          },
        ]);
      });
    });

    describe('when the workflow fails to be fetched', () => {
      beforeEach(() => {
        mockWorkflowApi.getGraphqlData.mockRejectedValue(new Error('Problem with Workflow API'));
      });

      it('returns the errored payload', async () => {
        const results = await workflowController.getWorkflowById({ workflowId: '1' });
        expect(results).toEqual([
          {
            eventName: 'workflowError',
            data: 'Error fetching workflow: Problem with Workflow API',
          },
        ]);
      });
    });

    describe('subscribe to fetched workflow', () => {
      describe('when the workflow is running', () => {
        beforeEach(() => {
          mockWorkflowApi.getGraphqlData.mockResolvedValue(runningCheckpoint);
        });
        it('subscribes to workflow updates', async () => {
          await workflowController.getWorkflowById({
            workflowId: 'gid://gitlab/Ai::DuoWorkflows::Workflow/1',
          });
          expect(mockWorkflowApi.subscribeToUpdates).toHaveBeenCalledWith(
            expect.any(Function),
            'gid://gitlab/Ai::DuoWorkflows::Workflow/1',
          );
        });
      });

      describe('when the workflow is not running', () => {
        beforeEach(() => {
          mockWorkflowApi.getGraphqlData.mockResolvedValue(expectedRunningCheckpoint);
        });
        it('does not subscribe to workflow updates', async () => {
          await workflowController.getWorkflowById({
            workflowId: 'gid://gitlab/Ai::DuoWorkflows::Workflow/1',
          });
          expect(mockWorkflowApi.subscribeToUpdates).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('startWorkflow', () => {
    describe('when the workflow starts successfully', () => {
      beforeEach(() => {
        mockWorkflowApi.runWorkflow.mockResolvedValue('1');
      });

      it('returns the expected payload', async () => {
        const results = await workflowController.startWorkflow({
          goal: 'test-goal',
          image: 'test-image',
        });
        expect(results).toEqual([
          { eventName: 'workflowStarted', data: '1' },
          { eventName: 'workflowStatus', data: DuoWorkflowStatus.CREATED },
          expect.any(Promise),
        ]);
      });
    });

    describe('when the workflow fails to start', () => {
      beforeEach(() => {
        mockWorkflowApi.runWorkflow.mockRejectedValue(new Error('Error starting workflow'));
      });

      it('returns the errored payload', async () => {
        const results = await workflowController.startWorkflow({
          goal: 'test-goal',
          image: 'test-image',
        });
        expect(results).toEqual([{ eventName: 'workflowError', data: 'Error starting workflow' }]);
      });
    });

    describe('watching the container', () => {
      let resolveWatcher: ({ StatusCode }: { StatusCode: number }) => void;
      let workflowId: string;

      beforeEach(() => {
        workflowId = '1';

        mockWorkflowApi.watchWorkflowExecutor.mockReturnValue(
          new Promise((resolve) => {
            resolveWatcher = resolve;
          }),
        );
        mockWorkflowApi.runWorkflow.mockResolvedValue(workflowId);
      });

      it('drops a workflow when status code is non-zero', async () => {
        resolveWatcher({ StatusCode: 1 });

        const [, , watcher] = await workflowController.startWorkflow({
          goal: 'test-goal',
          image: 'test-image',
        });

        expect(mockWorkflowApi.updateStatus).toHaveBeenCalledWith({
          workflowId,
          statusEvent: DuoWorkflowStatusEvent.DROP,
        });

        await expect(watcher).resolves.toEqual({
          eventName: 'workflowError',
          data: 'The executor container failed unexpectedly. Please try again later.',
        });
      });

      it('does not drop a workflow when status code is zero', async () => {
        resolveWatcher({ StatusCode: 0 });

        const [, , watcher] = await workflowController.startWorkflow({
          goal: 'test-goal',
          image: 'test-image',
        });

        expect(mockWorkflowApi.updateStatus).not.toHaveBeenCalled();
        await expect(watcher).resolves.toEqual(NO_REPLY);
      });
    });
  });

  describe('sendEvent', () => {
    it('calls the sendEvent function', async () => {
      await workflowController.sendWorkflowEvent({
        eventType: 'pause',
        workflowId: '1',
        message: '',
      });
      expect(mockWorkflowApi.sendEvent).toHaveBeenCalledWith('1', 'pause', '');
    });
  });

  describe('stopSubscriptions', () => {
    it('calls the disconnectCable function', async () => {
      await workflowController.stopSubscriptions();
      expect(mockWorkflowApi.disconnectCable).toHaveBeenCalled();
    });
  });
});

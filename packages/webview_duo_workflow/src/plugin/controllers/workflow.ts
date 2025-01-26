import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import { GET_WORKFLOW_EVENTS_QUERY } from '../../app/graphql/queries';
import { getStatus, parseWorkflowData } from '../utils';
import {
  DuoWorkflowEvent,
  DuoWorkflowEventConnection,
  DuoWorkflowStatus,
  DuoWorkflowStatusEvent,
  DuoWorkflowStatusUpdateResponse,
} from '../../types';
import {
  ControllerData,
  ControllerNoReply,
  ControllerResponse,
  getWorkflowParams,
  sendWorkflowEventParams,
  startWorkflowParams,
} from './types';
import { NO_REPLY } from './constants';

export const initWorkflowController = (
  workflowApi: WorkflowAPI,
  subscriptionCallback: (message: DuoWorkflowEvent) => void,
) => {
  return {
    async getWorkflowById({ workflowId }: getWorkflowParams): Promise<ControllerResponse[]> {
      try {
        const graphqlWorkflowId = `gid://gitlab/Ai::DuoWorkflows::Workflow/${workflowId}`;

        const duoWorkflowEvent: DuoWorkflowEventConnection = await workflowApi.getGraphqlData({
          query: GET_WORKFLOW_EVENTS_QUERY,
          variables: { workflowId: graphqlWorkflowId },
        });
        const parsedDuoWorkflowEvent = parseWorkflowData(duoWorkflowEvent);

        const status = getStatus(parsedDuoWorkflowEvent);

        if (status !== DuoWorkflowStatus.FINISHED) {
          await workflowApi.subscribeToUpdates(subscriptionCallback, workflowId);
        }

        const events = [
          { eventName: 'workflowStarted', data: workflowId },
          { eventName: 'workflowCheckpoint', data: parsedDuoWorkflowEvent },
          { eventName: 'workflowStatus', data: status },
        ];

        if (parsedDuoWorkflowEvent.workflowGoal) {
          events.push({ eventName: 'workflowGoal', data: parsedDuoWorkflowEvent.workflowGoal });
        }

        return events;
      } catch (e) {
        const error = e as Error;

        return [{ eventName: 'workflowError', data: `Error fetching workflow: ${error?.message}` }];
      }
    },

    async sendWorkflowEvent({
      eventType,
      workflowId,
      message,
    }: sendWorkflowEventParams): Promise<ControllerNoReply> {
      await workflowApi.sendEvent(workflowId, eventType, message);
      return NO_REPLY;
    },

    async startWorkflow({ goal, image }: startWorkflowParams): Promise<ControllerData> {
      try {
        const workflowId = await workflowApi.runWorkflow(goal, image);
        await workflowApi.subscribeToUpdates(subscriptionCallback, workflowId);

        const watcher = workflowApi
          .watchWorkflowExecutor()
          .then<ControllerNoReply | DuoWorkflowStatusUpdateResponse>(({ StatusCode }) => {
            if (StatusCode > 0) {
              return workflowApi.updateStatus({
                workflowId,
                statusEvent: DuoWorkflowStatusEvent.DROP,
              });
            }

            return NO_REPLY;
          })
          .then((res) => {
            if (res === NO_REPLY) {
              return NO_REPLY;
            }

            return {
              eventName: 'workflowError',
              data: 'The executor container failed unexpectedly. Please try again later.',
            };
          });

        return [
          { eventName: 'workflowStarted', data: workflowId },
          { eventName: 'workflowStatus', data: DuoWorkflowStatus.CREATED },
          watcher,
        ];
      } catch (e) {
        const error = e as Error;
        return [{ eventName: 'workflowError', data: error.message }];
      }
    },

    stopSubscriptions(): ControllerNoReply {
      workflowApi.disconnectCable();
      return NO_REPLY;
    },
  };
};

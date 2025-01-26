import { WorkflowGraphqlPayload } from '@khulnasoft-lsp/workflow-api';
import { WorkflowEvent } from '../../common/duo_workflow_events';
import { NO_REPLY } from './constants';

export interface WorkflowGraphqlPayloadClient extends WorkflowGraphqlPayload {
  eventName: string;
}

export type getWorkflowParams = { workflowId: string };
export type startWorkflowParams = { goal: string; image: string };
export type sendWorkflowEventParams = {
  eventType: WorkflowEvent;
  workflowId: string;
  message: string;
};
export type openUrlParams = { url: string };

export type ControllerResponse = {
  eventName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

export type ControllerNoReply = typeof NO_REPLY;

export type ControllerData =
  | ControllerResponse
  | (Promise<ControllerResponse | ControllerNoReply | ControllerResponse[]> | ControllerResponse)[]
  | ControllerNoReply;

export type ControllerResponseEnum = Promise<ControllerData> | ControllerNoReply;

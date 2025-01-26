import { SupportedSinceInstanceVersion } from '@khulnasoft/core';
import { createInterfaceId } from '@khulnasoft/di';
import {
  DuoWorkflowEvent,
  DuoWorkflowStatusUpdate,
  DuoWorkflowStatusUpdateResponse,
  WorkflowEvent,
} from '@khulnasoft/webview-duo-workflow';

export type WorkflowGraphqlPayload = {
  query: string;
  variables?: Record<string, unknown>;
  supportedSinceInstanceVersion?: SupportedSinceInstanceVersion;
};

// FIXME: rename to WorkflowApi -- the LS project uses camel case for abbreviations  (Api, GraphQl)
export interface WorkflowAPI {
  disconnectCable(): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getGraphqlData(payload: WorkflowGraphqlPayload): Promise<any>;
  getProjectPath(): string;
  isDockerImageAvailable(image: string): Promise<boolean>;
  pullDockerImage(image: string): Promise<string>;
  runWorkflow(goal: string, image: string): Promise<string>;
  watchWorkflowExecutor(): Promise<{ StatusCode: number }>;
  subscribeToUpdates(
    messageCallback: (message: DuoWorkflowEvent) => void,
    workflowId: string,
  ): Promise<void>;
  sendEvent(workflowID: string, eventType: WorkflowEvent, message?: string): Promise<void>;
  updateStatus(statusUpdate: DuoWorkflowStatusUpdate): Promise<DuoWorkflowStatusUpdateResponse>;
}

export const WorkflowAPI = createInterfaceId<WorkflowAPI>('WorkflowAPI');

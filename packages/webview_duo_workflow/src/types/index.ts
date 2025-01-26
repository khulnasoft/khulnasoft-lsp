import { DuoWorkflowStatus } from '../common/duo_workflow_status';

export { DuoWorkflowStatus } from '../common/duo_workflow_status';
export { WorkflowEvent } from '../common/duo_workflow_events';

export type DuoWorkflowEvent = {
  checkpoint: string;
  errors: string[];
  metadata: string;
  workflowGoal: string;
  workflowStatus: DuoWorkflowStatus;
};

export type DuoWorkflowEvents = {
  nodes: DuoWorkflowEvent[];
};

export type DuoWorkflowEventConnection = {
  duoWorkflowEvents: DuoWorkflowEvents;
};

export type CheckpointStatus = 'Planning' | 'Execution' | 'Completed' | 'Error';

export type ChannelValue = {
  status: CheckpointStatus;
};

export type DuoWorkflowCheckpoint = {
  ts: string;
  channel_values: ChannelValue;
};

export type ParsedDuoWorkflowEvent = {
  checkpoint: DuoWorkflowCheckpoint;
  errors: string[];
  metadata: string;
  workflowGoal: string;
  workflowStatus: DuoWorkflowStatus;
};

export type DuoWorkflowInfo = {
  id: string;
  projectId: string;
  humanStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type DuoWorkflowsNode = {
  node: DuoWorkflowInfo;
};

export type DuoWorkflowsEdge = {
  edges: DuoWorkflowsNode[];
};

export type DuoWorkflowsPayload = {
  duoWorkflowWorkflows: DuoWorkflowsEdge;
};

export type ProjectInfo = {
  id: string;
  fullPath: string;
};

export enum DuoWorkflowStatusEvent {
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
  FINISH = 'finish',
  DROP = 'drop',
}

export type DuoWorkflowStatusUpdate = {
  workflowId: string;
  statusEvent: DuoWorkflowStatusEvent;
};

export type DuoWorkflowStatusUpdateResponse = {
  workflow: {
    id: string;
    status: DuoWorkflowStatus;
  };
};

export type EnablementCheckType = {
  name: string;
  value: boolean;
  message: string;
};

export type HealthCheckData = {
  enabled: boolean;
  checks: EnablementCheckType[];
};

export type HealthCheckResponse = {
  project: {
    id: string;
    duoWorkflowStatusCheck: HealthCheckData;
  };
};

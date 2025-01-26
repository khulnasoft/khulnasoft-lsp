import {
  DuoWorkflowCheckpoint,
  ParsedDuoWorkflowEvent,
  DuoWorkflowEventConnection,
  DuoWorkflowStatus,
  DuoWorkflowEvent,
} from '@khulnasoft/webview-duo-workflow';

export const defaultCheckpoint = {
  checkpoint: {
    ts: expect.any(String),
    channel_values: { status: 'Planning' },
  },
  errors: [],
  metadata: '',
  workflowStatus: DuoWorkflowStatus.RUNNING,
  workflowGoal: '',
};

export const PLANNING_CHECKPOINT: DuoWorkflowCheckpoint = {
  ts: '2024-08-14T19:02:32.881580+00:00',
  channel_values: { status: 'Planning' },
};

export const EXECUTING_CHECKPOINT: DuoWorkflowCheckpoint = {
  ts: '2024-08-15T19:02:32.881580+00:00',
  channel_values: { status: 'Execution' },
};
export const COMPLETED_CHECKPOINT: DuoWorkflowCheckpoint = {
  ts: '2024-08-16T19:02:32.881580+00:00',
  channel_values: { status: 'Completed' },
};

export const DUO_EVENT_PLANNING: ParsedDuoWorkflowEvent = {
  checkpoint: PLANNING_CHECKPOINT,
  metadata: '',
  errors: [],
  workflowStatus: DuoWorkflowStatus.RUNNING,
  workflowGoal: '',
};

export const DUO_EVENT_EXECUTING: ParsedDuoWorkflowEvent = {
  checkpoint: EXECUTING_CHECKPOINT,
  metadata: '',
  errors: [],
  workflowStatus: DuoWorkflowStatus.RUNNING,
  workflowGoal: '',
};

export const DUO_EVENT_COMPLETED: ParsedDuoWorkflowEvent = {
  checkpoint: COMPLETED_CHECKPOINT,
  metadata: '',
  errors: [],
  workflowStatus: DuoWorkflowStatus.FINISHED,
  workflowGoal: '',
};

export const LANG_EVENT_PLANNING: DuoWorkflowEvent = {
  checkpoint: JSON.stringify(PLANNING_CHECKPOINT),
  workflowStatus: DuoWorkflowStatus.RUNNING,
  metadata: '',
  errors: [],
  workflowGoal: '',
};

export const LANG_EVENT_EXECUTING: DuoWorkflowEvent = {
  checkpoint: JSON.stringify(EXECUTING_CHECKPOINT),
  workflowStatus: DuoWorkflowStatus.RUNNING,
  metadata: '',
  errors: [],
  workflowGoal: '',
};

export const LANG_EVENT_COMPLETED: DuoWorkflowEvent = {
  checkpoint: JSON.stringify(COMPLETED_CHECKPOINT),
  workflowStatus: DuoWorkflowStatus.FINISHED,
  metadata: '',
  errors: [],
  workflowGoal: '',
};

export const langGraphPayload: DuoWorkflowEventConnection = {
  duoWorkflowEvents: {
    nodes: [LANG_EVENT_EXECUTING, LANG_EVENT_COMPLETED, LANG_EVENT_PLANNING],
  },
};

export const parsedLangGraphPayload = [
  DUO_EVENT_EXECUTING,
  DUO_EVENT_COMPLETED,
  DUO_EVENT_PLANNING,
];

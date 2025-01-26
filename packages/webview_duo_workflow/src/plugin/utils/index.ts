import {
  DuoWorkflowCheckpoint,
  ParsedDuoWorkflowEvent,
  DuoWorkflowStatus,
  DuoWorkflowEvent,
  DuoWorkflowEventConnection,
} from '@khulnasoft/webview-duo-workflow';

export const parseLangGraphCheckpoint = (langGraphCheckpoint: string): DuoWorkflowCheckpoint => {
  try {
    return JSON.parse(langGraphCheckpoint);
  } catch (e) {
    throw new Error('Failed to parse checkpoint');
  }
};

export const getLatestCheckpoint = (
  duoWorkflowEvents: ParsedDuoWorkflowEvent[],
): ParsedDuoWorkflowEvent => {
  if (!duoWorkflowEvents.length) {
    return {
      metadata: '',
      errors: [],
      workflowStatus: DuoWorkflowStatus.RUNNING,
      checkpoint: {
        ts: new Date().toISOString(),
        channel_values: {
          status: 'Planning',
        },
      },
      workflowGoal: '',
    };
  }

  const sortedCheckpointes = [...duoWorkflowEvents].sort(
    (a: ParsedDuoWorkflowEvent, b: ParsedDuoWorkflowEvent) => {
      return new Date(b.checkpoint.ts).getTime() - new Date(a.checkpoint.ts).getTime();
    },
  );

  return sortedCheckpointes[0];
};

export const getStatus = (duoWorkflowEvent: ParsedDuoWorkflowEvent): DuoWorkflowStatus => {
  return duoWorkflowEvent.workflowStatus;
};

export const parseWorkflowData = (response: DuoWorkflowEventConnection): ParsedDuoWorkflowEvent => {
  const results = response?.duoWorkflowEvents?.nodes?.map((node: DuoWorkflowEvent) => {
    // TODO: Remove once we are no longer using LangGraph internal data structure.
    return { ...node, checkpoint: parseLangGraphCheckpoint(node.checkpoint) };
  });

  // TODO: Remove once we have guaranteed order.
  return getLatestCheckpoint(results);
};

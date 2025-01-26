import { DuoWorkflowStatus } from '../types';

export const getIDfromGraphqlId = (graphqId: string): string => {
  const match = graphqId.match(/\d+$/);
  if (!match?.length) {
    throw new Error(`Invalid graphqlId: ${graphqId}`);
  }

  return match[0];
};

const DUO_WORKFLOW_STATUS_DISPLAY = {
  [DuoWorkflowStatus.CREATED]: 'Created',
  [DuoWorkflowStatus.RUNNING]: 'Running',
  [DuoWorkflowStatus.PAUSED]: 'Paused',
  [DuoWorkflowStatus.FINISHED]: 'Complete',
  [DuoWorkflowStatus.FAILED]: 'Failed',
  [DuoWorkflowStatus.STOPPED]: 'Stopped',
};

export const getDuoWorkflowStatusDisplay = (status: DuoWorkflowStatus) =>
  DUO_WORKFLOW_STATUS_DISPLAY[status];

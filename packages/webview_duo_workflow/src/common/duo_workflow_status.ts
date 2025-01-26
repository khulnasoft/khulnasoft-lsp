export enum DuoWorkflowStatus {
  CREATED = 'CREATED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED',
  STOPPED = 'STOPPED',
}

export const isTerminated = (status: DuoWorkflowStatus) =>
  [DuoWorkflowStatus.FINISHED, DuoWorkflowStatus.FAILED, DuoWorkflowStatus.STOPPED].includes(
    status,
  );

export const isRunning = (status: DuoWorkflowStatus) => !isTerminated(status);

export const isPaused = (status: DuoWorkflowStatus) => status === DuoWorkflowStatus.PAUSED;

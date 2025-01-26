import { DuoWorkflowStatus } from '../../../common/duo_workflow_status.ts';
import { WORKFLOW_SET_GOAL, WORKFLOW_STARTED } from '../../constants.ts';

export const runningWorkflow = {
  id: '1',
  goal: 'Make a hello world file for python',
  status: DuoWorkflowStatus.RUNNING,
  step: WORKFLOW_STARTED,
  checkpoint: { properties: {} },
};

export const newWorkflow = {
  id: '',
  goal: '',
  status: '',
  step: WORKFLOW_SET_GOAL,
  checkpoint: {},
};

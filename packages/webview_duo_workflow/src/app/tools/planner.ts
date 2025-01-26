import { ToolUse } from './utils';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled';

export type AddNewTaskToolUse = ToolUse<'add_new_task', never>;
export type RemoveTaskToolUse = ToolUse<'remove_task', never>;
export type UpdateTaskDescription = ToolUse<'update_task_description', never>;
export type GetPlanToolUse = ToolUse<'get_plan', never>;
export type SetTaskStatusToolUse = ToolUse<'set_task_status', { status: TaskStatus }>;

export type PlanToolUse =
  | AddNewTaskToolUse
  | RemoveTaskToolUse
  | UpdateTaskDescription
  | GetPlanToolUse
  | SetTaskStatusToolUse;

const TASK_STATUS_MESSAGE_MAP = {
  'Not Started': 'Not started the current task',
  'In Progress': 'Started the current task',
  Completed: 'Completed the current task',
  Cancelled: 'Cancelled the current task',
};

export const PLAN_TOOL_MESSAGE_MAP = Object.freeze({
  add_new_task: () => 'Adding tasks to the plan',
  remove_task: () => 'Removing tasks from the plan',
  update_task_description: () => 'Updating task descriptions',
  get_plan: () => '',
  set_task_status: (input: { status: TaskStatus }) =>
    TASK_STATUS_MESSAGE_MAP[input.status] || `Current task is now ${input.status.toLowerCase()}`,
});

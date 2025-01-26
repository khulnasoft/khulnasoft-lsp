import { ToolUse } from './utils';

export type CommandToolInput = { command: string; args: string };

export type RunCommandToolUse = ToolUse<'run_command', CommandToolInput>;
export type HandoverToolUse = ToolUse<'handover_tool', { summary: string }>;
export type GitToolUse = ToolUse<'run_git_command', CommandToolInput>;
export type GetJobLogsToolUse = ToolUse<'get_job_logs', { job_id: string }>;
export type GetPipelineErrorsToolUse = ToolUse<'get_pipeline_errors', { merge_request_id: string }>;
export type GetProjectToolUse = ToolUse<'get_project', never>;

export type GeneralToolUse =
  | RunCommandToolUse
  | HandoverToolUse
  | GitToolUse
  | GetJobLogsToolUse
  | GetPipelineErrorsToolUse
  | GetProjectToolUse;

export const GENERAL_TOOL_MESSAGE_MAP = Object.freeze({
  run_command: (input: CommandToolInput) => `Running \`${input.command}\``,
  handover_tool: (input: { summary: string }) => input.summary,
  run_git_command: (input: CommandToolInput) => `Running \`${input.command} ${input.args}\``,
  get_job_logs: (input: { job_id: string }) => `Reading job ${input.job_id}`,
  get_pipeline_errors: (input: { merge_request_id: string }) =>
    `Reading pipeline for !${input.merge_request_id}`,
  get_project: () => `Reading project details`,
});

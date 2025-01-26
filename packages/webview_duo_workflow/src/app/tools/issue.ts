import { ToolUse } from './utils';

export type IssueToolInput = { issue_id: string };

export type CreateIssueToolUse = ToolUse<'create_issue', { title: string }>;
export type ListIssuesToolUse = ToolUse<'list_issues', { project_id: string }>;
export type GetIssueToolUse = ToolUse<'get_issue', IssueToolInput>;
export type UpdateIssueToolUse = ToolUse<'update_issue', IssueToolInput>;
export type CreateIssueNoteToolUse = ToolUse<'create_issue_note', IssueToolInput>;
export type ListIssueNotesToolUse = ToolUse<'list_issue_notes', IssueToolInput>;
export type GetIssueNoteToolUse = ToolUse<'get_issue_note', IssueToolInput>;

export type IssueToolUse =
  | CreateIssueToolUse
  | ListIssuesToolUse
  | GetIssueToolUse
  | UpdateIssueToolUse
  | CreateIssueToolUse
  | CreateIssueNoteToolUse
  | ListIssueNotesToolUse
  | GetIssueNoteToolUse;

export const ISSUE_MESSAGE_MAP = Object.freeze({
  create_issue: (input: { title: string }) => `Creating issue \`${input.title}\``,
  list_issues: (input: { project_id: string }) =>
    `Listing issues in project \`${input.project_id}\``,
  get_issue: (input: IssueToolInput) => `Reading issue #${input.issue_id}`,
  update_issue: (input: IssueToolInput) => `Editing issue #${input.issue_id}`,
  create_issue_note: (input: IssueToolInput) => `Commenting on issue #${input.issue_id}`,
  list_issue_notes: (input: IssueToolInput) => `Getting comments from issue #${input.issue_id}`,
  get_issue_note: (input: IssueToolInput) => `Reading specific comment on issue #${input.issue_id}`,
});

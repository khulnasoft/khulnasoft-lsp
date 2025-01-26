import { ToolUse } from './utils';

export type SearchToolInput = { search: string; search_type: string };

export type GitlabGroupProjectSearch = ToolUse<'gitlab_group_project_search', SearchToolInput>;
export type GitlabIssueSearch = ToolUse<'gitlab_issue_search', SearchToolInput>;
export type GitlabMergeRequestSearch = ToolUse<'gitlab_merge_request_search', SearchToolInput>;
export type GitlabMilestoneSearch = ToolUse<'gitlab_milestone_search', SearchToolInput>;
export type GitlabUserSearch = ToolUse<'gitlab__user_search', SearchToolInput>;
export type GitlabBlobSearch = ToolUse<'gitlab_blob_search', SearchToolInput>;
export type GitlabCommitSearch = ToolUse<'gitlab_commit_search', SearchToolInput>;
export type GitlabWikiBlobSearch = ToolUse<'gitlab_wiki_blob_search', SearchToolInput>;
export type GitlabNoteSearch = ToolUse<'gitlab_note_search', SearchToolInput>;

export type SearchToolUse =
  | GitlabGroupProjectSearch
  | GitlabIssueSearch
  | GitlabMergeRequestSearch
  | GitlabMilestoneSearch
  | GitlabUserSearch
  | GitlabBlobSearch
  | GitlabCommitSearch
  | GitlabWikiBlobSearch
  | GitlabNoteSearch;

export const SEARCH_TOOL_MESSAGE_MAP = Object.freeze({
  gitlab_group_project_search: (input: SearchToolInput) =>
    `Searching for project \`${input.search}\``,
  gitlab_issue_search: (input: SearchToolInput) =>
    `Searching for issue \`${input.search}\` in \`${input.search_type}\``,
  gitlab_merge_request_search: (input: SearchToolInput) =>
    `Searching for merge request \`${input.search}\` in \`${input.search_type}\``,
  gitlab_milestone_search: (input: SearchToolInput) =>
    `Searching for milestone \`${input.search}\` in \`${input.search_type}\``,
  gitlab__user_search: (input: SearchToolInput) =>
    `Searching for user \`${input.search}\` in \`${input.search_type}\``,
  gitlab_blob_search: (input: SearchToolInput) =>
    `Searching for \`${input.search}\` in \`${input.search_type}\``,
  gitlab_commit_search: (input: SearchToolInput) =>
    `Searching for commit \`${input.search}\` in \`${input.search_type}\``,
  gitlab_wiki_blob_search: (input: SearchToolInput) =>
    `Searching for \`${input.search}\` in \`${input.search_type}\` wiki`,
  gitlab_note_search: (input: SearchToolInput) =>
    `Searching for \`${input.search}\` in \`${input.search_type}\` comments`,
});

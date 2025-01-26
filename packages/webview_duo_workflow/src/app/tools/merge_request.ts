import { ToolUse } from './utils';

export type MergeReqestToolInput = { merge_request_iid: string };

export type CreateMergeRequestToolUse = ToolUse<'create_merge_request', { source_branch: string }>;
export type GetMergeRequestToolUse = ToolUse<'get_merge_request', MergeReqestToolInput>;
export type ListMergeRequestDifssToolUse = ToolUse<
  'list_merge_request_diffs',
  MergeReqestToolInput
>;
export type CreateMergeRequestNoteToolUse = ToolUse<
  'create_merge_request_note',
  MergeReqestToolInput
>;
export type ListAllMergeRequestNotesToolUse = ToolUse<
  'list_all_merge_request_notes',
  MergeReqestToolInput
>;
export type UpdateMergeRequestToolUse = ToolUse<'update_merge_request', MergeReqestToolInput>;

export type MergeRequestToolUse =
  | CreateMergeRequestToolUse
  | GetMergeRequestToolUse
  | ListMergeRequestDifssToolUse
  | CreateMergeRequestNoteToolUse
  | ListAllMergeRequestNotesToolUse
  | UpdateMergeRequestToolUse;

export const MERGE_REQUEST_TOOL_MESSAGE_MAP = Object.freeze({
  create_merge_request: (input: { source_branch: string }) =>
    `Creating merge request for branch \`${input.source_branch}\``,
  get_merge_request: (input: MergeReqestToolInput) =>
    `Getting merge request !${input.merge_request_iid}`,
  list_merge_request_diffs: (input: MergeReqestToolInput) =>
    `Reading merge request !${input.merge_request_iid}`,
  create_merge_request_note: (input: MergeReqestToolInput) =>
    `Commenting on merge request !${input.merge_request_iid}`,
  list_all_merge_request_notes: (input: MergeReqestToolInput) =>
    `Getting comments from merge request !${input.merge_request_iid}`,
  update_merge_request: (input: MergeReqestToolInput) =>
    `Editing merge request !${input.merge_request_iid}`,
});

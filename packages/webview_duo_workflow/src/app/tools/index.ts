import { ToolFunction, ToolMessageMap } from './utils';
import { GENERAL_TOOL_MESSAGE_MAP, GeneralToolUse } from './general';
import { FILE_TOOL_MESSAGE_MAP, FileToolUse } from './file';
import { ISSUE_MESSAGE_MAP, IssueToolUse } from './issue';
import { MERGE_REQUEST_TOOL_MESSAGE_MAP, MergeRequestToolUse } from './merge_request';
import { PLAN_TOOL_MESSAGE_MAP, PlanToolUse } from './planner';
import { SEARCH_TOOL_MESSAGE_MAP, SearchToolUse } from './search';

type ToolUse =
  | GeneralToolUse
  | FileToolUse
  | IssueToolUse
  | MergeRequestToolUse
  | PlanToolUse
  | SearchToolUse;

type ToolUseMessage = ToolUse & { type: string };

export const TOOL_MESSAGE_MAP: ToolMessageMap<ToolUse> = Object.freeze({
  ...GENERAL_TOOL_MESSAGE_MAP,
  ...FILE_TOOL_MESSAGE_MAP,
  ...ISSUE_MESSAGE_MAP,
  ...MERGE_REQUEST_TOOL_MESSAGE_MAP,
  ...PLAN_TOOL_MESSAGE_MAP,
  ...SEARCH_TOOL_MESSAGE_MAP,
});

export const toolUseToMessage = ({ name, input, type }: ToolUseMessage) => {
  return {
    type,
    name,
    text: (TOOL_MESSAGE_MAP[name] as ToolFunction<ToolUse, typeof name>)?.(input) ?? '',
  };
};

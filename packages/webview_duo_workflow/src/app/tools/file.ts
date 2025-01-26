import { ToolUse } from './utils';

export type FileToolInput = { file_path: string };
export type DirectoryToolInput = { directory: string };
type FindFileToolInput = DirectoryToolInput & { name_pattern: string };

export type ReadFileToolUse = ToolUse<'read_file', FileToolInput>;
export type WriteFileWithContentsToolUse = ToolUse<'write_file_with_contents', FileToolInput>;
export type FindFileToolUse = ToolUse<'find_files', FindFileToolInput>;
export type LsToolUse = ToolUse<'ls_files', DirectoryToolInput>;

export type FileToolUse =
  | ReadFileToolUse
  | WriteFileWithContentsToolUse
  | FindFileToolUse
  | LsToolUse;

export const FILE_TOOL_MESSAGE_MAP = Object.freeze({
  read_file: (input: FileToolInput) => `Reading file \`${input.file_path}\``,
  write_file_with_contents: (input: FileToolInput) => `Editing file \`${input.file_path}\``,
  find_files: (input: FindFileToolInput) =>
    `Searching files in \`${input.directory}\` with pattern \`${input.name_pattern}\``,
  ls_files: (input: DirectoryToolInput) => `Getting files from \`${input.directory}\``,
});

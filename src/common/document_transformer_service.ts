import { DocumentUri, InlineCompletionContext, WorkspaceFolder } from 'vscode-languageserver';
import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { z } from 'zod';
import { LsTextDocuments } from './external_interfaces';
import { sanitizeRange } from './utils/sanitize_range';
import { SecretRedactor } from './secret_redaction';
import { getRelativePath, getFileExtensionByLanguageId, fileNeedsExtension } from './utils/path';
import { log } from './log';

// FIXME: rename this to FileAndCursor or FileAndPosition
export const IDocContext = z.object({
  /**
   * The text before the cursor.
   */
  prefix: z.string().describe('The text before the cursor.'),
  /**
   * The text after the cursor.
   */
  suffix: z.string().describe('The text after the cursor.'),
  /**
   * This is most likely path to a file relative to the workspace
   *  but if the file doesn't belong to a workspace, this field is identical to document URI
   *
   * Example: If the workspace root is `/home/user/workspace`
   * and the file is `/home/user/workspace/src/file.txt`,
   * then the filename is `src/file.txt`.
   */
  fileRelativePath: z
    .string()
    .describe(
      'Path to a file relative to the workspace, or identical to document URI if file does not belong to a workspace.',
    ),
  position: z
    .object({
      line: z.number(),
      character: z.number(),
    })
    .describe('The position in the document.'),
  /**
   * The URI of the document.
   */
  uri: z.string().describe('The URI of the document.'),
  /**
   * languageId of the document
   * @readonly
   */
  languageId: z.string().describe('languageId of the document'),
  /**
   * The workspace folder that the document belongs to.
   */
  workspaceFolder: z
    .object({
      uri: z.string(),
      name: z.string(),
    })
    .optional()
    .describe('The workspace folder that the document belongs to.'),
});

export type IDocContext = z.infer<typeof IDocContext>;

export interface IDocTransformer {
  transform(context: IDocContext): IDocContext;
}

const getMatchingWorkspaceFolder = (
  fileUri: DocumentUri,
  workspaceFolders: WorkspaceFolder[],
): WorkspaceFolder | undefined => workspaceFolders.find((wf) => fileUri.startsWith(wf.uri));

export interface DocumentTransformerService {
  get(uri: string): TextDocument | undefined;
  getContext(
    uri: string,
    position: Position,
    workspaceFolders: WorkspaceFolder[],
    completionContext?: InlineCompletionContext,
  ): IDocContext | undefined;
  transform(context: IDocContext): IDocContext;
}

export const DocumentTransformerService = createInterfaceId<DocumentTransformerService>(
  'DocumentTransformerService',
);
@Injectable(DocumentTransformerService, [LsTextDocuments, SecretRedactor])
export class DefaultDocumentTransformerService implements DocumentTransformerService {
  #transformers: IDocTransformer[] = [];

  #documents: LsTextDocuments;

  constructor(documents: LsTextDocuments, secretRedactor: SecretRedactor) {
    this.#documents = documents;
    this.#transformers.push(secretRedactor);
  }

  get(uri: string) {
    return this.#documents.get(uri);
  }

  getContext(
    uri: string,
    position: Position,
    workspaceFolders: WorkspaceFolder[],
    completionContext?: InlineCompletionContext,
  ): IDocContext | undefined {
    const doc = this.get(uri);
    if (doc === undefined) {
      return undefined;
    }
    return this.transform(getDocContext(doc, position, workspaceFolders, completionContext));
  }

  transform(context: IDocContext): IDocContext {
    return this.#transformers.reduce((ctx, transformer) => transformer.transform(ctx), context);
  }
}

export function getDocContext(
  document: TextDocument,
  position: Position,
  workspaceFolders: WorkspaceFolder[],
  completionContext?: InlineCompletionContext,
): IDocContext {
  let prefix: string;

  if (completionContext?.selectedCompletionInfo) {
    const { selectedCompletionInfo } = completionContext;
    const range = sanitizeRange(selectedCompletionInfo.range);

    prefix = `${document.getText({
      start: document.positionAt(0),
      end: range.start,
    })}${selectedCompletionInfo.text}`;
  } else {
    prefix = document.getText({ start: document.positionAt(0), end: position });
  }

  const suffix = document.getText({
    start: position,
    end: document.positionAt(document.getText().length),
  });

  const workspaceFolder = getMatchingWorkspaceFolder(document.uri, workspaceFolders);
  if (!workspaceFolder) {
    log.debug(
      `No workspace folder found for ${document.uri}, current workspace folders: ${workspaceFolders.map((wf) => wf.uri).join(', ')}`,
    );
  }
  let fileRelativePath = getRelativePath(document.uri, workspaceFolder);

  if (fileNeedsExtension(fileRelativePath)) {
    fileRelativePath = `${fileRelativePath}${getFileExtensionByLanguageId(document.languageId)}`;
  }

  return {
    prefix,
    suffix,
    fileRelativePath,
    position,
    uri: document.uri,
    languageId: document.languageId,
    workspaceFolder,
  };
}

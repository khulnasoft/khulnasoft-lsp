import { createInterfaceId } from '@khulnasoft/di';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { WorkspaceFolder } from 'vscode-languageserver-types';

export type AIContextProviderType =
  | 'open_tab'
  | 'local_file_search'
  | 'issue'
  | 'merge_request'
  | 'snippet'
  | 'dependency'
  | 'local_git';

export type AIContextCategory =
  | 'file'
  | 'snippet'
  | 'issue'
  | 'merge_request'
  | 'dependency'
  | 'local_git';

export type AIContextItemMetadata = {
  title: string;
  enabled: boolean;
  disabledReasons?: string[];
  subType: AIContextProviderType;
  icon: string;
  secondaryText: string;
  subTypeLabel: string;
  /**
   * The languageId of the file, if the context item is a file
   */
  languageId?: TextDocument['languageId'];
};
/** Items that can be added to the AI context
 * @param {string} id - The id of the context item
 * @param {string} content - The content of the context item to be used by the AI, only sent on retrieval
 * @param {AIContextCategory} category - The category or source of the context item
 * @param {AIContextItemMetadata} metadata - Metadata about the context item, format depends on category
 */
export type AIContextItem = {
  id: string;
  category: AIContextCategory;
  content?: string;
  metadata: AIContextItemMetadata;
};

export type AIContextSearchQuery = {
  category: AIContextCategory;
  query: string;
  workspaceFolders?: WorkspaceFolder[];
};

export type AIContextPolicyResponse = {
  enabled: boolean;
  disabledReasons?: string[];
};

export type AIRequest = {
  featureType: 'code_suggestions' | 'duo_chat';
};

export interface AIContextManager {
  addSelectedContextItem(contextItem: AIContextItem): Promise<boolean>;
  removeSelectedContextItem(contextItem: AIContextItem): Promise<boolean>;
  getSelectedContextItems(): Promise<AIContextItem[]>;
  searchContextItemsForCategory(query: AIContextSearchQuery): Promise<AIContextItem[]>;
  getAvailableCategories(): Promise<AIContextCategory[]>;
  retrieveContextItemsWithContent(request: AIRequest): Promise<AIContextItem[]>;
  clearSelectedContextItems(): boolean;
  getItemWithContent(item: AIContextItem): Promise<AIContextItem>;
}

export const AIContextManager = createInterfaceId<AIContextManager>('AIContextManager');

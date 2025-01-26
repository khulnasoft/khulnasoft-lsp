import { createInterfaceId } from '@khulnasoft/di';
import {
  AIContextItem,
  AIContextSearchQuery,
  AIContextCategory,
  AIContextProviderType,
  AIContextPolicyResponse,
} from '@khulnasoft/ai-context';
import { CodeSuggestionsAIRequest } from './ai_context_provider';

export interface AIContextProvider<T extends AIContextItem = AIContextItem> {
  type: AIContextProviderType;
  addSelectedContextItem: (contextItem: T) => Promise<void>;
  removeSelectedContextItem: (id: string) => Promise<void>;
  clearSelectedContextItems: () => Promise<void>;
  replaceSelectedContextItem: (oldItem: T, newItem: T) => Promise<void>;
  getSelectedContextItems: () => Promise<T[]>;
  searchContextItems: (query: AIContextSearchQuery) => Promise<T[]>;
  retrieveSelectedContextItemsWithContent: () => Promise<T[]>;
  getItemWithContent: (item: T) => Promise<T>;
  isAvailable: () => Promise<AIContextPolicyResponse>;
  /**
   * Returns the context items that are relevant for the given document context.
   *
   * Primary use at this time is Code Suggestions.
   *
   * This method should not include a context item that is the same as the iDocContext.
   *
   * So if the iDocContext is file://path/to/file.ts, we should not include a context item that is the same file.
   *
   * @param {IDocContext} iDocContext - The `IDocContext` of the document
   * @param {Tree} tree - The tree AST of the `iDocContext` document, parsed by `web-tree-sitter`
   * @deprecated - TODO: We are going to redesign the overall architecture to be modular at the feature level,
   * see https://github.com/khulnasoft/khulnasoft-lsp/-/issues/752#note_2310700284
   */
  getContextForCodeSuggestions: (args: CodeSuggestionsAIRequest) => Promise<T[]>;
}

// Generic AIContextProvider interface ID cannot handle contravariant parameters and covariant returns properly in DI registration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AIContextProvider = createInterfaceId<AIContextProvider<any>>('AIContextProvider');

export interface AIContextPolicyProvider {
  isContextItemAllowed: (relativePath: string) => Promise<AIContextPolicyResponse>;
}

export const AIContextEndpoints = {
  QUERY: '$/gitlab/ai-context/query',
  ADD: '$/gitlab/ai-context/add',
  REMOVE: '$/gitlab/ai-context/remove',
  CURRENT_ITEMS: '$/gitlab/ai-context/current-items',
  RETRIEVE: '$/gitlab/ai-context/retrieve',
  GET_PROVIDER_CATEGORIES: '$/gitlab/ai-context/get-provider-categories',
  CLEAR: '$/gitlab/ai-context/clear',
  GET_ITEM_CONTENT: '$/gitlab/ai-context/get-item-content',
} as const;

export type AIContextEndpointTypes = {
  [AIContextEndpoints.QUERY]: {
    request: AIContextSearchQuery;
    response: AIContextItem[];
  };
  [AIContextEndpoints.ADD]: {
    request: AIContextItem;
    response: boolean;
  };
  [AIContextEndpoints.REMOVE]: {
    request: AIContextItem;
    response: boolean;
  };
  [AIContextEndpoints.CURRENT_ITEMS]: {
    request: undefined;
    response: AIContextItem[];
  };
  [AIContextEndpoints.RETRIEVE]: {
    request: undefined;
    response: AIContextItem[];
  };
  [AIContextEndpoints.GET_PROVIDER_CATEGORIES]: {
    request: undefined;
    response: AIContextCategory[];
  };
  [AIContextEndpoints.CLEAR]: {
    request: undefined;
    response: boolean;
  };
  [AIContextEndpoints.GET_ITEM_CONTENT]: {
    request: AIContextItem;
    response: AIContextItem;
  };
};
export type GitDiffRequest = {
  /**
   * The URI of the repository to get the diff for
   */
  repositoryUri: string;
  /**
   * The branch to get the diff for
   * This will compare the current changes to the branch
   */
  branch: string;
};

export const AiContextEditorRequests = {
  GIT_DIFF: '$/gitlab/ai-context/git-diff',
  GIT_COMMIT_CONTENTS: '$/gitlab/ai-context/git-commit-contents',
} as const;
export type EditorRequestEndpointTypes = {
  [AiContextEditorRequests.GIT_DIFF]: {
    request: GitDiffRequest;
    response: string;
  };
};

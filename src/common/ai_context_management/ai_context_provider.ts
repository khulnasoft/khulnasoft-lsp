import type {
  AIContextItem,
  AIContextSearchQuery,
  AIContextProviderType,
  AIContextPolicyResponse,
  AIRequest,
} from '@khulnasoft/ai-context';
import { Tree } from 'web-tree-sitter';
import { z } from 'zod';
import { log } from '../log';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../services/duo_access/duo_feature_access_service';
import { IDocContext } from '../document_transformer_service';
import type { AIContextProvider } from '.';

export const CodeSuggestionsAIRequest = z.object({
  featureType: z.literal('code_suggestions'),
  iDocContext: IDocContext,
  tree: z.custom<Tree>(),
});

const AIRequestSchema = z
  .object({
    featureType: z.enum(['code_suggestions', 'duo_chat']),
  })
  .and(
    z.discriminatedUnion('featureType', [
      CodeSuggestionsAIRequest,

      z.object({
        featureType: z.literal('duo_chat'),
      }),
    ]),
  );

export type CodeSuggestionsAIRequest = z.infer<typeof CodeSuggestionsAIRequest>;

export abstract class AbstractAIContextProvider<T extends AIContextItem>
  implements AIContextProvider<T>
{
  #selectedContextItems: T[] = [];

  type: AIContextProviderType;

  readonly #duoFeatureAccessService: DuoFeatureAccessService;

  /**
   * If set, the provider will be enabled only if the current user has the specified feature enabled.
   * If not set, the provider will always be available
   */
  protected abstract readonly duoRequiredFeature?: DuoFeature;

  protected onContextItemAdded?: (contextItem: T) => void;

  protected onBeforeContextItemRemoved?: (contextItem: T) => void;

  protected onBeforeAllContextItemsRemoved?: () => void;

  protected canItemBeAdded?: (contextItem: T) => Promise<AIContextPolicyResponse>;

  constructor(
    type: AIContextProviderType = 'open_tab',
    duoFeatureAccessService: DuoFeatureAccessService,
  ) {
    this.#selectedContextItems = [];
    this.type = type;
    this.#duoFeatureAccessService = duoFeatureAccessService;
  }

  protected notifyContextItemAdded(contextItem: T): void {
    if (this.onContextItemAdded) {
      this.onContextItemAdded(contextItem);
    }
  }

  protected notifyContextItemToBeRemoved(contextItem: T): void {
    if (this.onBeforeContextItemRemoved) {
      this.onBeforeContextItemRemoved(contextItem);
    }
  }

  protected notifyAllContextItemsToBeRemoved(): void {
    if (this.onBeforeAllContextItemsRemoved) {
      this.onBeforeAllContextItemsRemoved();
    }
  }

  protected async itemAllowedByPolicies(contextItem: T): Promise<AIContextPolicyResponse> {
    if (this.canItemBeAdded) {
      return this.canItemBeAdded(contextItem);
    }
    return Promise.resolve({
      enabled: true,
    });
  }

  #findItemWithId(id: string): T | undefined {
    return this.#selectedContextItems.find((item) => item.id === id);
  }

  #findItemIndex(id: string): number {
    const index = this.#selectedContextItems.findIndex((item) => item.id === id);
    if (index === -1) {
      const error = new Error(`Item with id ${id} not found in context items.`);
      log.error(error);
      throw error;
    }
    return index;
  }

  async addSelectedContextItem(contextItem: T): Promise<void> {
    const canBeAdded = await this.itemAllowedByPolicies(contextItem);
    if (!canBeAdded) {
      log.error(`Context item is not allowed by context policies: ${JSON.stringify(contextItem)}`);

      return;
    }
    if (contextItem.metadata.subType !== this.type) {
      log.error(
        `Context item type "${contextItem.metadata.subType}" does not match context provider type "${this.type}"`,
      );
    } else if (this.#findItemWithId(contextItem.id)) {
      log.error(`Context item with ID "${contextItem.id}" already exists`);
    } else {
      this.#selectedContextItems.push(contextItem);
      this.notifyContextItemAdded(contextItem);
    }
  }

  async removeSelectedContextItem(id: string): Promise<void> {
    const index = this.#findItemIndex(id);
    this.notifyContextItemToBeRemoved(this.#selectedContextItems[index]);
    this.#selectedContextItems.splice(index, 1);
  }

  async clearSelectedContextItems(): Promise<void> {
    if (this.#selectedContextItems.length) {
      this.notifyAllContextItemsToBeRemoved();
      this.#selectedContextItems = [];
    }
  }

  async replaceSelectedContextItem(oldItem: T, newItem: T): Promise<void> {
    const index = this.#findItemIndex(oldItem.id);
    this.#selectedContextItems[index] = newItem;
  }

  async getSelectedContextItems(): Promise<T[]> {
    return this.#selectedContextItems;
  }

  abstract searchContextItems(query: AIContextSearchQuery): Promise<T[]>;

  abstract retrieveSelectedContextItemsWithContent(): Promise<T[]>;

  async retrieveContextItemsWithContent(request: AIRequest): Promise<T[]> {
    const aiRequest = AIRequestSchema.parse(request);

    if (aiRequest.featureType === 'code_suggestions') {
      const contextItems = await this.getContextForCodeSuggestions(aiRequest);
      return contextItems;
    }
    return this.retrieveSelectedContextItemsWithContent();
  }

  abstract getItemWithContent(item: T): Promise<T>;

  async isAvailable(): Promise<AIContextPolicyResponse> {
    if (!this.duoRequiredFeature) {
      log.debug(
        `[AIContextProvider] No feature requirement for provider type "${this.type}", provider is enabled`,
      );
      return {
        enabled: true,
      };
    }

    const response = await this.#duoFeatureAccessService.isFeatureEnabled(this.duoRequiredFeature);
    log.debug(
      `[AIContextProvider] Provider type "${this.type}" has required feature "${this.duoRequiredFeature}": ${response.enabled}`,
    );
    return response;
  }

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getContextForCodeSuggestions(_: CodeSuggestionsAIRequest): Promise<T[]> {
    return [];
  }
}

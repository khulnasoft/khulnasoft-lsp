import { createCollectionId, Injectable } from '@khulnasoft/di';
import {
  AIContextItem,
  AIContextSearchQuery,
  AIContextCategory,
  AIContextProviderType,
  AIContextManager,
  AIRequest,
} from '@khulnasoft/ai-context';
import { WorkspaceFolder } from 'vscode-languageserver-types';
import { log } from '../log';
import { FeatureFlagService, InstanceFeatureFlags } from '../feature_flags';
import { ConfigService } from '../config_service';
import { AiContextTransformerService } from './context_transformers/ai_context_transformer_service';
import { AIContextProvider } from '.';

const AIContextMapping: Record<AIContextCategory, AIContextProviderType[]> = {
  file: ['open_tab', 'local_file_search'],
  snippet: ['snippet'],
  issue: ['issue'],
  merge_request: ['merge_request'],
  dependency: ['dependency'],
  local_git: ['local_git'],
};

export const AiContextProviderCollection = createCollectionId(AIContextProvider);

@Injectable(AIContextManager, [
  ConfigService,
  FeatureFlagService,
  AiContextTransformerService,
  AiContextProviderCollection,
])
export class DefaultAIContextManager implements AIContextManager {
  readonly #providers: AIContextProvider<AIContextItem>[] = [];

  #availableProviders: AIContextProvider<AIContextItem>[] = [];

  readonly #featureFlagService: FeatureFlagService;

  readonly #transformerService: AiContextTransformerService;

  #workspaceFolders: WorkspaceFolder[];

  constructor(
    configService: ConfigService,
    featureFlagService: FeatureFlagService,
    aiContextTransformerService: AiContextTransformerService,
    providers: AIContextProvider[],
  ) {
    this.#featureFlagService = featureFlagService;
    this.#transformerService = aiContextTransformerService;
    this.#providers = providers;

    this.#workspaceFolders = configService.get('client.workspaceFolders') ?? [];
    configService.onConfigChange((config) => {
      this.#workspaceFolders = config.client.workspaceFolders ?? [];
    });
  }

  async #getProviderAndPerform(
    subType: AIContextProviderType | undefined,
    callback: (provider: AIContextProvider<AIContextItem>) => Promise<void>,
  ): Promise<void> {
    const e = new Error('No provider found for type');
    const provider = this.#availableProviders.find((p) => p.type === subType);
    if (!provider) {
      throw e;
    }
    await callback(provider);
  }

  #getProviderForItem(item: AIContextItem): AIContextProvider<AIContextItem> {
    const foundProvider = this.#availableProviders.find(
      (provider) => provider.type === item.metadata?.subType,
    );
    if (!foundProvider) {
      throw new Error(
        `No provider found for type "${item.metadata.subType || 'undefined item subtype'}"`,
      );
    }
    return foundProvider;
  }

  async addSelectedContextItem(contextItem: AIContextItem): Promise<boolean> {
    // FIXME: aiContextManager should return the result of the operation upstream,
    // the methods should also be async https://gitlab.com/gitlab-org/gitlab/-/issues/489292
    try {
      log.info(`[AIContextManager] received context item add request ${contextItem.id}`);
      await this.#getProviderAndPerform(contextItem.metadata?.subType, async (provider) => {
        await provider.addSelectedContextItem(contextItem);
      });
      log.info(`[AIContextManager] added item result ${true}`);
      return true;
    } catch (e) {
      log.error(`[AIContextManager] error adding context item`, e);
      return false;
    }
  }

  async removeSelectedContextItem(contextItem: AIContextItem): Promise<boolean> {
    log.info(`[AIContextManager] received context item remove request ${contextItem.id}`);
    try {
      await this.#getProviderAndPerform(contextItem.metadata?.subType, async (provider) => {
        await provider.removeSelectedContextItem(contextItem.id);
      });
      log.info(`[AIContextManager] removed item result ${true}`);
      return true;
    } catch (e) {
      log.error(`[AIContextManager] error removing context item`, e);
      return false;
    }
  }

  async getSelectedContextItems(): Promise<AIContextItem[]> {
    const currentItems = (
      await Promise.all(
        this.#availableProviders.map((provider) => provider.getSelectedContextItems()),
      )
    ).flat();
    log.info(`[AIContextManager] returning ${currentItems.length} current context items`);
    return currentItems;
  }

  async searchContextItemsForCategory(query: AIContextSearchQuery): Promise<AIContextItem[]> {
    log.info(
      `[AIContextManager] received context search query, category: ${query.category}, query: ${query.query}`,
    );
    try {
      const contextItems: AIContextItem[] = [];
      const typesForCategory = AIContextMapping[query.category];
      const workspaceFolders = query.workspaceFolders ?? this.#workspaceFolders;
      if (!workspaceFolders.length) {
        log.debug(`[AIContextManager] No workspace folders detected.`);
      }

      const providerQuery = {
        ...query,
        workspaceFolders,
      };

      const contextItemsPromises = this.#availableProviders
        .filter((p) => typesForCategory.includes(p.type))
        .map(async (provider) => {
          return provider.searchContextItems(providerQuery);
        });

      const contextItemsForAllProviders = await Promise.all(contextItemsPromises);
      contextItemsForAllProviders.forEach((items) => contextItems.push(...items));
      // TODO: add params to enable/disable the logic below
      // https://gitlab.com/gitlab-org/gitlab/-/issues/489466
      const selectedContextItemsSet = new Set(
        (await this.getSelectedContextItems())
          .map((item) => item?.id)
          .filter((id) => id !== undefined),
      );
      // Filter out the selected context items from the context items
      const nonSelectedItems = contextItems.filter((item) => !selectedContextItemsSet.has(item.id));

      const results = this.#disabledContextItemsToTheBack(nonSelectedItems);
      log.info(`[AIContextManager] context search query had ${results.length} results`);
      return results;
    } catch (e) {
      log.error(`[AIContextManager] error searching context items`, e);
      return [];
    }
  }

  #disabledContextItemsToTheBack(contextItems: AIContextItem[]) {
    return contextItems.sort((a, b) => {
      if (a.metadata?.enabled === b.metadata?.enabled) return 0;
      return a.metadata?.enabled ? -1 : 1;
    });
  }

  async getAvailableCategories(): Promise<AIContextCategory[]> {
    if (
      !this.#featureFlagService.isInstanceFlagEnabled(InstanceFeatureFlags.DuoAdditionalContext)
    ) {
      return [];
    }

    const providerPromises = this.#providers.map(async (provider) => {
      const { enabled } = await provider.isAvailable();
      return enabled ? provider : null;
    });
    const providers = await Promise.all(providerPromises);
    this.#availableProviders = providers.filter(Boolean) as AIContextProvider[];

    const types = this.#availableProviders.map((provider) => provider.type);
    const categories = Object.keys(AIContextMapping) as AIContextCategory[];
    const availableCategories = types
      .map((type) =>
        categories.find((category) =>
          AIContextMapping[category].includes(type as AIContextProviderType),
        ),
      )
      .filter((category) => category !== undefined);

    log.info(
      `[AIContextManager] returning ${availableCategories.length} available context provider categories: "${availableCategories.join(', ')}`,
    );

    return availableCategories;
  }

  async retrieveContextItemsWithContent({ featureType }: AIRequest): Promise<AIContextItem[]> {
    if (featureType === 'code_suggestions') {
      // TODO: will be implemented in a follow up PR
      throw new Error('Code suggestions are not supported');
    }
    const providersWithContext = await Promise.all(
      this.#availableProviders.map((provider) =>
        provider.retrieveSelectedContextItemsWithContent(),
      ),
    );
    const contextItems = providersWithContext.flat().filter(Boolean);
    return Promise.all(contextItems.map((contextItem) => this.#transformItemContent(contextItem)));
  }

  clearSelectedContextItems(): boolean {
    log.info('[AIContextManager] clearing all selected context items');
    this.#availableProviders.forEach((provider) => provider.clearSelectedContextItems());
    return true;
  }

  async getItemWithContent(item: AIContextItem): Promise<AIContextItem> {
    log.info(`[AIContextManager] received get context item content request ${item.id}`);
    const provider = this.#getProviderForItem(item);
    const itemWithContent = await provider.getItemWithContent(item);
    log.info(`[AIContextManager] retrieved context item content ${itemWithContent}`);
    return this.#transformItemContent(itemWithContent);
  }

  async #transformItemContent(item: AIContextItem): Promise<AIContextItem> {
    try {
      return await this.#transformerService.transform(item);
    } catch (error) {
      // Since content transformation failed, we strip out the content completely.
      // This is to ensure we don't send sensitive values (e.g. because our secret redaction transformer failed)
      log.error(
        `[AIContextManager] Error transforming context item content. Item content will be excluded.`,
        error,
      );
      return {
        ...item,
        content: undefined,
      };
    }
  }

  async getProviderForType(type: AIContextProviderType): Promise<AIContextProvider> {
    const provider = this.#providers.find((p) => p.type === type);
    if (!provider) {
      throw new Error(`No provider found for type "${type}"`);
    }
    return provider;
  }
}

import { IDocContext } from '../../document_transformer_service';
import { log } from '../../log';
import { LRU_CACHE_BYTE_SIZE_LIMIT, OpenTabsLruCache } from '../../open_tabs/lru_cache';
import { OpenTabAIContextItem } from '../../ai_context_management/context_providers/open_tabs/open_tabs_provider';
import { AdvancedContextResolver } from './advanced_context_resolver';

export class OpenTabsResolver extends AdvancedContextResolver {
  static #instance: OpenTabsResolver | undefined;

  static getInstance(): OpenTabsResolver {
    if (!OpenTabsResolver.#instance) {
      log.debug('OpenTabsResolver: initializing');
      OpenTabsResolver.#instance = new OpenTabsResolver();
    }
    return OpenTabsResolver.#instance;
  }

  static destroyInstance(): void {
    OpenTabsResolver.#instance = undefined;
  }

  async *buildContext({
    documentContext,
    includeCurrentFile = false,
  }: {
    documentContext: IDocContext;
    includeCurrentFile?: boolean;
  }): AsyncGenerator<OpenTabAIContextItem> {
    const lruCache = OpenTabsLruCache.getInstance(LRU_CACHE_BYTE_SIZE_LIMIT);
    const openFiles = lruCache.mostRecentFiles({
      context: documentContext,
      includeCurrentFile,
    });

    for (const file of openFiles) {
      yield {
        id: file.uri,
        category: 'file',
        content: `${file.prefix}${file.suffix}`,
        metadata: {
          languageId: file.languageId,
          subType: 'open_tab',
          iid: file.uri,
          title: file.uri,
          relativePath: file.fileRelativePath,
          workspaceFolder: file.workspaceFolder,
          project: undefined,
          enabled: true,
          icon: 'file',
          secondaryText: file.uri,
          subTypeLabel: 'Open Tab',
        },
      };
    }
  }
}

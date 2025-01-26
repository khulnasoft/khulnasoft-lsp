import type { TextDocument } from 'vscode-languageserver-textdocument';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ConfigService } from '../config_service';
import { DocumentService } from '../document_service';
import { DocumentTransformerService } from '../document_transformer_service';
import { SupportedLanguagesService } from '../suggestion/supported_languages_service';
import { LsConnection } from '../external_interfaces';
import { log } from '../log';
import { TextDocumentChangeListenerType } from '../text_document_change_listener_type';
import { LRU_CACHE_BYTE_SIZE_LIMIT, OpenTabsLruCache } from './lru_cache';

export interface OpenTabsService extends DefaultOpenTabsService {}

export const OpenTabsService = createInterfaceId<OpenTabsService>('OpenTabsService');

@Injectable(OpenTabsService, [
  ConfigService,
  LsConnection,
  DocumentService,
  DocumentTransformerService,
  SupportedLanguagesService,
])
export class DefaultOpenTabsService implements OpenTabsService {
  #configService: ConfigService;

  #documentTransformer: DocumentTransformerService;

  constructor(
    configService: ConfigService,
    connection: LsConnection,
    documentService: DocumentService,
    documentTransformer: DocumentTransformerService,
  ) {
    this.#configService = configService;
    this.#documentTransformer = documentTransformer;

    const subscription = documentService.onDocumentChange(async ({ document }, handlerType) => {
      await this.#updateOpenTabs(document, handlerType);
    });
    connection.onShutdown(() => subscription.dispose());
  }

  /**
   * Currently updates the LRU cache with the most recently accessed files in the workspace.
   */
  async #updateOpenTabs(document: TextDocument, handlerType: TextDocumentChangeListenerType) {
    const lruCache = OpenTabsLruCache.getInstance(LRU_CACHE_BYTE_SIZE_LIMIT);
    // eslint-disable-next-line default-case
    switch (handlerType) {
      case TextDocumentChangeListenerType.onDidClose: {
        // We don't check if the language is supported for `onDidClose` because we want
        // always attempt to delete the file from the cache.
        const fileDeleted = lruCache.deleteFile(document.uri);
        if (fileDeleted) {
          log.debug(`[AdvancedContextService] File ${document.uri} was deleted from the LRU cache`);
        } else {
          log.debug(`[AdvancedContextService] File ${document.uri} was not found in the LRU cache`);
        }
        break;
      }
      case TextDocumentChangeListenerType.onDidChangeContent:
      case TextDocumentChangeListenerType.onDidSave:
      case TextDocumentChangeListenerType.onDidOpen:
      case TextDocumentChangeListenerType.onDidSetActive: {
        const context = this.#documentTransformer.getContext(
          document.uri,
          { line: 0, character: 0 },
          this.#configService.get().client.workspaceFolders ?? [],
          undefined,
        );

        if (!context) {
          log.debug(`[AdvancedContextService] document context for ${document.uri} was not found`);
          return;
        }

        lruCache.updateFile(context);
        log.debug(`[AdvancedContextService] uri ${document.uri} was updated in the MRU cache`);

        break;
      }
    }
  }

  getOpenTabCache(): OpenTabsLruCache {
    return OpenTabsLruCache.getInstance(LRU_CACHE_BYTE_SIZE_LIMIT);
  }
}

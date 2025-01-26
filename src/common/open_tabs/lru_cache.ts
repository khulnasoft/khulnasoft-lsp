import { LRUCache } from 'lru-cache';
import type { DocumentUri } from 'vscode-languageserver-protocol';
import type { IDocContext } from '../document_transformer_service';
import { log } from '../log';
import { getByteSize } from '../utils/byte_size';

/**
 * This is the maximum byte size of the LRU cache used for Open Tabs
 */
export const LRU_CACHE_BYTE_SIZE_LIMIT = 24 * 1024 * 1024; // 24MB

/**
 * Least Recently Used (LRU) cache for storing the most recently accessed files in the workspace.
 * The cache is currently used to provide context-aware suggestions for AI Features.
 * We discard the least recently used files when the cache is full.
 */
export class OpenTabsLruCache {
  #cache: LRUCache<DocumentUri, IDocContext>;

  static #instance: OpenTabsLruCache | undefined;

  // eslint-disable-next-line no-restricted-syntax
  private constructor(maxSize: number) {
    this.#cache = new LRUCache<DocumentUri, IDocContext>({
      maxSize,
      sizeCalculation: (value) => this.#getDocumentSize(value),
    });
  }

  static getInstance(maxSize: number): OpenTabsLruCache {
    if (!OpenTabsLruCache.#instance) {
      log.debug('LruCache: initializing');
      OpenTabsLruCache.#instance = new OpenTabsLruCache(maxSize);
    }
    return OpenTabsLruCache.#instance;
  }

  static destroyInstance(): void {
    OpenTabsLruCache.#instance = undefined;
  }

  get openFiles() {
    return this.#cache;
  }

  #getDocumentSize(context: IDocContext): number {
    const size = getByteSize(`${context.prefix}${context.suffix}`);
    return Math.max(1, size);
  }

  /**
   * Update the file in the cache.
   * Uses lru-cache under the hood.
   */
  updateFile(context: IDocContext) {
    return this.#cache.set(context.uri, context);
  }

  /**
   * @returns `true` if the file was deleted, `false` if the file was not found
   */
  deleteFile(uri: DocumentUri): boolean {
    return this.#cache.delete(uri);
  }

  /**
   * Get the most recently accessed files in the workspace
   * @param context - The current document context `IDocContext`
   * @param includeCurrentFile - Include the current file in the list of most recent files, default is `true`
   */
  mostRecentFiles({
    context,
    includeCurrentFile = true,
  }: {
    context?: IDocContext;
    includeCurrentFile?: boolean;
  }): IDocContext[] {
    const files = Array.from(this.#cache.values());

    if (!context) {
      return files;
    }

    return files.filter(
      (file) =>
        context?.workspaceFolder?.uri === file.workspaceFolder?.uri &&
        (includeCurrentFile || file.uri !== context?.uri),
    );
  }
}

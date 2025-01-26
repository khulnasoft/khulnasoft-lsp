import { Injectable } from '@khulnasoft/di';
import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { URI, Utils } from 'vscode-uri';
import { filter } from 'fuzzaldrin-plus';
import { AIContextItem, AIContextItemMetadata, AIContextSearchQuery } from '@khulnasoft/ai-context';
import { DuoProjectAccessChecker } from '../../services/duo_access';
import { log } from '../../log';
import { AIContextProvider } from '..';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../../services/duo_access/duo_feature_access_service';
import { DuoProjectStatus } from '../../services/duo_access/project_access_checker';
import { FsClient } from '../../services/fs/fs';
import { getRelativePath } from '../../services/fs/utils';
import { RepositoryFile } from '../../services/git/repository';
import { DefaultRepositoryService, RepositoryService } from '../../services/git/repository_service';
import { asyncDebounce, type AsyncDebouncedFunction } from '../../utils/async_debounce';
import { isBinaryFile } from '../../utils/binary_content';
import { AbstractAIContextProvider } from '../ai_context_provider';
import { BINARY_FILE_DISABLED_REASON } from '../context_transformers/ai_context_binary_file_transformer';

type LocalFileMetadata = AIContextItemMetadata & {
  subType: 'local_file_search';
  relativePath?: string;
  workspaceFolder?: WorkspaceFolder;
  project: string;
};

export type LocalFileAIContextItem = AIContextItem & {
  category: 'file';
  metadata: LocalFileMetadata;
};

export interface LocalFilesContextProvider
  extends AbstractAIContextProvider<LocalFileAIContextItem> {}

// TODO: Make this configurable
// https://gitlab.com/gitlab-org/gitlab/-/issues/490602
const MAX_RESULTS = 100;

@Injectable(AIContextProvider, [
  RepositoryService,
  DuoProjectAccessChecker,
  FsClient,
  DuoFeatureAccessService,
])
export class DefaultLocalFileContextProvider
  extends AbstractAIContextProvider<LocalFileAIContextItem>
  implements LocalFilesContextProvider
{
  #repositoryService: DefaultRepositoryService;

  #projectAccessChecker: DuoProjectAccessChecker;

  #fsClient: FsClient;

  #debouncedSearchLocalFiles: AsyncDebouncedFunction<
    (query: AIContextSearchQuery) => Promise<LocalFileAIContextItem[]>
  >;

  duoRequiredFeature = DuoFeature.IncludeFileContext;

  constructor(
    repositoryService: DefaultRepositoryService,
    projectAccessChecker: DuoProjectAccessChecker,
    fsClient: FsClient,
    duoFeatureAccessService: DuoFeatureAccessService,
  ) {
    super('local_file_search', duoFeatureAccessService);
    this.#repositoryService = repositoryService;
    this.#projectAccessChecker = projectAccessChecker;
    this.#fsClient = fsClient;
    this.#debouncedSearchLocalFiles = asyncDebounce(this.#searchLocalFiles.bind(this), 50);
  }

  async searchContextItems(query: AIContextSearchQuery): Promise<LocalFileAIContextItem[]> {
    log.info(`[LocalFilesContextProvider] Searching for ${query.query}`);
    if (query.query.trim() === '') {
      return [];
    }

    return this.#debouncedSearchLocalFiles(query);
  }

  /**
   * Note: this a search for local files across *all* workspace folders.
   * TODO: all the client to call a single workspace folder
   */
  async #searchLocalFiles(query: AIContextSearchQuery): Promise<LocalFileAIContextItem[]> {
    // since we are searching across multiple workspace folders, we need to collect all the files in a map
    // with the file URI as the key. This will deduplicate the files across workspace folders.
    const allFilesMap: Map<string, RepositoryFile> = new Map();
    for (const folder of query?.workspaceFolders ?? []) {
      const repositoryFiles = this.#repositoryService.getCurrentFilesForWorkspace(folder.uri, {
        excludeGitFolder: true,
        excludeIgnored: true,
      });
      for (const file of repositoryFiles) {
        allFilesMap.set(file.uri.fsPath, file);
      }
    }

    log.info(`[LocalFilesContextProvider] ${allFilesMap.size} total files`);

    const fileNames = Array.from(allFilesMap.keys());
    const results = filter(fileNames, query.query, { maxResults: MAX_RESULTS });
    log.info(
      `[LocalFilesContextProvider] Found ${results.length} results. Max allowed: ${MAX_RESULTS}`,
    );

    const itemPromises = results.map(async (result): Promise<LocalFileAIContextItem | null> => {
      const file = allFilesMap.get(result);

      if (!file) return null;

      const disabledReasons: string[] = [];

      const isBinary = await isBinaryFile(file.uri, this.#fsClient);
      if (isBinary) {
        disabledReasons.push(BINARY_FILE_DISABLED_REASON);
      }

      const { project: projectFromChecker, status } = this.#projectAccessChecker.checkProjectStatus(
        file.uri.toString(),
        file.workspaceFolder,
      );
      if (status === DuoProjectStatus.DuoDisabled) {
        disabledReasons.push('project disabled');
      }

      const projectPath = projectFromChecker?.namespaceWithPath;
      const fileRelativePath = getRelativePath(URI.parse(file.workspaceFolder.uri), file.uri);

      return {
        id: file.uri.toString(),
        category: 'file' as const,
        metadata: {
          title: Utils.basename(file.uri),
          enabled: disabledReasons.length === 0,
          disabledReasons,
          project: projectPath ?? 'not a KhulnaSoft project',
          icon: 'document',
          secondaryText: fileRelativePath,
          subType: 'local_file_search',
          subTypeLabel: 'Project file',
          relativePath: fileRelativePath,
          workspaceFolder: file.workspaceFolder,
        },
      };
    });

    return (await Promise.all(itemPromises)).filter(
      (item): item is LocalFileAIContextItem => item !== null,
    );
  }

  async retrieveSelectedContextItemsWithContent(): Promise<LocalFileAIContextItem[]> {
    const items = await this.getSelectedContextItems();

    const itemsWithContentPromises = items.map(async (item) => {
      return this.getItemWithContent(item);
    });

    return Promise.all(itemsWithContentPromises);
  }

  async getItemWithContent(item: LocalFileAIContextItem): Promise<LocalFileAIContextItem> {
    const { readFile } = this.#fsClient.promises;
    const content = (await readFile(URI.parse(item.id).fsPath)).toString('utf-8');
    return {
      ...item,
      content,
    };
  }
}

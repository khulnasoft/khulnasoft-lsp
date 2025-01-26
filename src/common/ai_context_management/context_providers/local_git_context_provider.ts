import { Injectable } from '@khulnasoft/di';
import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { filter } from 'fuzzaldrin-plus';
import { AIContextItem, AIContextItemMetadata, AIContextSearchQuery } from '@khulnasoft/ai-context';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../../services/duo_access/duo_feature_access_service';
import { AbstractAIContextProvider } from '../ai_context_provider';
import { AiContextEditorRequests, AIContextProvider } from '..';
import { RepositoryService } from '../../services/git/repository_service';
import { DuoProjectAccessChecker } from '../../services/duo_access';
import { DuoProjectStatus } from '../../services/duo_access/project_access_checker';
import { log } from '../../log';
import { Repository } from '../../services/git/repository';
import { parseURIString } from '../../services/fs/utils';
import { LsConnection } from '../../external_interfaces';
import { asyncDebounce, AsyncDebouncedFunction } from '../../utils/async_debounce';

export type LocalGitContextMetadata = AIContextItemMetadata & {
  subType: 'local_git';
  repositoryUri: string;
  repositoryName: string;
  workspaceFolder: WorkspaceFolder;
  selectedBranch: string | undefined;
  gitType: 'diff';
};

export type GitContextItem = AIContextItem & {
  category: 'local_git';
  metadata: LocalGitContextMetadata;
};

export type RepositoryBranches = {
  mainBranch: string;
  currentBranch: string;
  allBranches: string[];
};

export type RepositoryInfo = {
  branches: RepositoryBranches;
  headRef: string;
  repository: Repository;
  name: string;
  enabled: boolean;
  workspaceFolder: WorkspaceFolder;
};

export interface LocalGitContextProvider extends AbstractAIContextProvider<GitContextItem> {}

@Injectable(AIContextProvider, [
  LsConnection,
  RepositoryService,
  DuoProjectAccessChecker,
  DuoFeatureAccessService,
])
export class DefaultLocalGitContextProvider
  extends AbstractAIContextProvider<GitContextItem>
  implements LocalGitContextProvider
{
  #lsConnection: LsConnection;

  #repositoryService: RepositoryService;

  #projectAccessChecker: DuoProjectAccessChecker;

  readonly #debouncedSearchIssues: AsyncDebouncedFunction<
    (query: AIContextSearchQuery) => Promise<GitContextItem[]>
  >;

  readonly duoRequiredFeature = DuoFeature.IncludeLocalGitContext;

  constructor(
    lsConnection: LsConnection,
    repositoryService: RepositoryService,
    projectAccessChecker: DuoProjectAccessChecker,
    duoFeatureAccessService: DuoFeatureAccessService,
  ) {
    super('local_git', duoFeatureAccessService);
    this.#lsConnection = lsConnection;
    this.#repositoryService = repositoryService;
    this.#projectAccessChecker = projectAccessChecker;
    this.#debouncedSearchIssues = asyncDebounce(this.#search.bind(this), 50);
  }

  /**
   * Searches for Git context items based on the query.
   *
   * @param query - The AI context search query.
   * @returns A promise that resolves to an array of Git context items.
   */
  async searchContextItems(query: AIContextSearchQuery): Promise<GitContextItem[]> {
    return this.#debouncedSearchIssues(query);
  }

  /**
   * Internal method to search commits and provide context items.
   *
   * @param query - The AI context search query.
   * @returns A promise that resolves to an array of Git context items.
   */
  async #search(query: AIContextSearchQuery): Promise<GitContextItem[]> {
    const uniqueRepositories = new Map<string, Repository>();

    for (const workspaceFolder of query?.workspaceFolders ?? []) {
      const repositories = this.#repositoryService.getRepositoriesForWorkspace(workspaceFolder.uri);
      for (const repository of repositories.values()) {
        uniqueRepositories.set(repository.uri.toString(), repository);
      }
    }

    const repositoryInfos = await Promise.all(
      Array.from(uniqueRepositories.values()).map((repository) =>
        this.#repositoryInfo({ repository, workspaceFolder: repository.workspaceFolder }),
      ),
    );

    const staticPromises = repositoryInfos.map((repositoryInfo) =>
      this.#getStaticOptionsForRepository({
        repositoryInfo,
      }),
    );

    const results = await Promise.all([...staticPromises]);

    const contextItemMap = new Map<string, GitContextItem>();
    const contextItems = results.flat().filter((item) => item !== undefined);

    if (query.query.trim() === '') {
      return contextItems;
    }

    for (const item of contextItems) {
      contextItemMap.set(item.metadata.title, item);
    }

    const fuzzyResults = filter(Array.from(contextItemMap.keys()), query.query, {
      maxResults: 100,
    });

    return fuzzyResults
      .map((result) => contextItemMap.get(result))
      .filter((item) => item !== undefined);
  }

  async #getStaticOptionsForRepository({
    repositoryInfo,
  }: {
    repositoryInfo: RepositoryInfo;
  }): Promise<GitContextItem[]> {
    // Internal to KhulnaSoft monolith. This following repositories are under
    // the KhulnaSoft Monolith spec folders (tmp/tests/gitlab-test).
    // We ignore these as they are likely unused in the KhulnaSoft workspace.
    if (
      repositoryInfo.name === 'gitlab-org/gitlab-test' ||
      repositoryInfo.name === 'gitlab-org/gitlab-test-fork'
    ) {
      return [];
    }

    const { name, enabled, repository, branches, headRef, workspaceFolder } = repositoryInfo;

    const createDiffItem = (branch: string | undefined, title: string): GitContextItem => ({
      id: `diff:${repository.uri.toString()}:${branch ?? headRef}`,
      category: 'local_git',
      metadata: {
        title,
        enabled,
        subType: 'local_git',
        repositoryUri: repository.uri.toString(),
        repositoryName: name,
        disabledReasons: enabled ? [] : ['Project disabled'],
        gitType: 'diff',
        workspaceFolder,
        selectedBranch: branch,
        icon: 'git',
        secondaryText: `Compare Changes with ${branch ?? headRef}`,
        subTypeLabel: 'Diff',
      },
    });

    const items: GitContextItem[] = [];

    if (branches.currentBranch !== branches.mainBranch) {
      items.push(createDiffItem(branches.mainBranch, `Diff from ${branches.mainBranch}`));
    }

    items.push(createDiffItem(undefined, `Diff from HEAD (working state)`));

    items.push(
      ...branches.allBranches
        .filter((branch) => branch !== branches.mainBranch && branch !== branches.currentBranch)
        .map((branch) => createDiffItem(branch, `Diff from ${branch}`)),
    );

    return items;
  }

  async #repositoryInfo({
    repository,
    workspaceFolder,
  }: {
    repository: Repository;
    workspaceFolder: WorkspaceFolder;
  }): Promise<RepositoryInfo> {
    const { project: projectFromChecker, status } = this.#projectAccessChecker.checkProjectStatus(
      repository.configFileUri.toString(),
      workspaceFolder,
    );

    const name = projectFromChecker
      ? projectFromChecker.namespaceWithPath
      : repository.uri.toString().replace(workspaceFolder.uri, '');

    const [branches, headRef] = await Promise.all([
      this.#branchesForRepository(repository),
      repository.getHeadRef(),
    ]);

    return {
      name,
      enabled: status !== DuoProjectStatus.DuoDisabled,
      branches,
      repository,
      workspaceFolder,
      headRef,
    };
  }

  async #branchesForRepository(
    repository: Repository,
  ): Promise<{ mainBranch: string; currentBranch: string; allBranches: string[] }> {
    const [mainBranch, currentBranch, allBranches] = await Promise.all([
      repository.getMainBranch(),
      repository.getCurrentBranch(),
      repository.listBranches(),
    ]);

    return { mainBranch, currentBranch, allBranches };
  }

  async getItemWithContent(item: GitContextItem): Promise<GitContextItem> {
    const repositoryUri = parseURIString(item.metadata.repositoryUri);
    const repository = this.#repositoryService.getRepositoryForWorkspace(
      item.metadata.workspaceFolder.uri,
      repositoryUri,
    );
    if (!repository) {
      log.error(`[GitContextProvider] Repository for ${repositoryUri.toString()} not found.`);
      return item;
    }

    switch (item.metadata.gitType) {
      case 'diff': {
        const diffString = await this.#lsConnection.sendRequest<string>(
          AiContextEditorRequests.GIT_DIFF,
          {
            repositoryUri: repository.uri.toString(),
            branch: item.metadata.selectedBranch,
          },
        );
        return {
          ...item,
          content: diffString,
        };
      }
      default:
        return item;
    }
  }

  /**
   * Retrieves the selected context items with their content (diffs).
   *
   * @returns A promise that resolves to an array of Git context items with content.
   */
  async retrieveSelectedContextItemsWithContent(): Promise<GitContextItem[]> {
    const items = await this.getSelectedContextItems();

    const itemsWithContentPromises = items.map(async (item) => {
      const itemWithContent = await this.getItemWithContent(item);
      return itemWithContent;
    });

    return Promise.all(itemsWithContentPromises);
  }
}

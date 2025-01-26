import { filter } from 'fuzzaldrin-plus';
import { Injectable } from '@khulnasoft/di';
import { WorkspaceFolder } from 'vscode-languageserver';
import { Utils } from 'vscode-uri';
import { AIContextItem, AIContextItemMetadata, AIContextSearchQuery } from '@khulnasoft/ai-context';
import { AbstractAIContextProvider } from '../ai_context_provider';
import { AIContextProvider } from '..';
import { Repository } from '../../services/git/repository';
import { RepositoryService } from '../../services/git/repository_service';
import { log } from '../../log';
import { getRelativePath } from '../../utils/path';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../../services/duo_access/duo_feature_access_service';
import { DependencyScanner } from './depdendency_scanner/scanner';
import { DependencyLibrary, ParsedDependency } from './depdendency_scanner/types';

type DependencyMetadata = AIContextItemMetadata & {
  subType: 'dependency';
  iid?: string;
  workspaceFolder?: WorkspaceFolder;
  project?: string;
  libs?: DependencyLibrary[];
};

export type DependencyAIContextItem = AIContextItem & {
  category: 'dependency';
  metadata: DependencyMetadata;
};

export interface DependencyContextProvider
  extends AbstractAIContextProvider<DependencyAIContextItem> {}

@Injectable(AIContextProvider, [RepositoryService, DependencyScanner, DuoFeatureAccessService])
export class DefaultDependencyContextProvider
  extends AbstractAIContextProvider<DependencyAIContextItem>
  implements DependencyContextProvider
{
  #repositoryService: RepositoryService;

  #dependencyScanner: DependencyScanner;

  duoRequiredFeature = DuoFeature.IncludeDependencyContext;

  constructor(
    repositoryService: RepositoryService,
    dependencyScanner: DependencyScanner,
    duoFeatureAccessService: DuoFeatureAccessService,
  ) {
    super('dependency', duoFeatureAccessService);
    this.#repositoryService = repositoryService;
    this.#dependencyScanner = dependencyScanner;
  }

  async searchContextItems(query: AIContextSearchQuery): Promise<DependencyAIContextItem[]> {
    const items: Promise<DependencyAIContextItem | null>[] = [];
    const repositories: Map<string, Repository> = new Map();
    for (const folder of query?.workspaceFolders ?? []) {
      for (const repo of this.#repositoryService.getRepositoriesForWorkspace(folder.uri).values()) {
        if (repo) repositories.set(repo.uri.path, repo);
      }
    }

    let repositoryPaths = Array.from(repositories.keys());
    if (query.query) {
      repositoryPaths = filter(repositoryPaths, query.query);
    }

    log.info(`[DependencyContextProvider] Found ${repositoryPaths.length} repositories.`);

    for (const repoPath of repositoryPaths) {
      const repo = repositories.get(repoPath);
      if (repo) {
        const item = this.#dependencyScanner
          .findDependencies(repo, repo.workspaceFolder)
          .then((deps) => {
            const depsWithLibs = deps.filter((d) => d.libs.length);

            const foundFiles = depsWithLibs
              .map((d) => getRelativePath(d.fileUri.toString(), repo.workspaceFolder))
              .join(', ');

            return {
              id: repo.uri.toString(),
              content: this.dependenciesContent(depsWithLibs),
              category: 'dependency',
              metadata: {
                title: `${Utils.basename(repo.uri)}`,
                secondaryText: foundFiles,
                icon: 'package',
                enabled: true,
                disabledReasons: [],
                subType: 'dependency',
                subTypeLabel: 'Project dependencies',
                libs: deps.map((d) => d.libs).flat(),
              },
            } as DependencyAIContextItem;
          })
          .catch((e) => {
            log.info(`[DependencyContextProvider] Error ${e.toString()}`);
            return null;
          });

        items.push(item);
      }
    }

    log.info(`[DependencyContextProvider] Found ${items.length} dependencies.`);

    return (await Promise.all(items)).filter((item) => {
      return item !== null;
    }) as DependencyAIContextItem[];
  }

  dependenciesContent(deps: ParsedDependency[]): string {
    return JSON.stringify(
      deps.map((d) => ({
        [d.type.lang]: d.libs.map((l: DependencyLibrary) => `${l.name}@${l.version}`),
      })),
    );
  }

  retrieveSelectedContextItemsWithContent(): Promise<DependencyAIContextItem[]> {
    return this.getSelectedContextItems();
  }

  getItemWithContent(item: DependencyAIContextItem): Promise<DependencyAIContextItem> {
    return Promise.resolve(item);
  }
}

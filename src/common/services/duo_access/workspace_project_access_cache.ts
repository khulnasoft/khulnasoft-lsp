import { EventEmitter } from 'events';
import { gql } from 'graphql-request';
import ini from 'ini';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { Disposable } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { KhulnaSoftApiClient } from '../../api';
import { ApiRequest } from '../../api_types';
import { log } from '../../log';
import { DirectoryWalker } from '../fs/dir';
import { FsClient } from '../fs/fs';
import { KhulnaSoftRemote, parseKhulnaSoftRemote } from '../git/git_remote_parser';
import { parseURIString } from '../fs/utils';

const DUO_PROJECT_CACHE_UPDATE_EVENT = 'duoProjectCacheUpdate';

/**
 * DuoProject is a representation of a Gitlab project with Duo features enabled.
 * the resulting data can look like this:
 * [
 *   {
 *     namespaceWithPath: 'path/to/project',
 *     uri: 'file:///path/to/project/.git/config',
 *     enabled: true,
 *   },
 *   {
 *     namespaceWithPath: 'path/to/project/nested',
 *     uri: 'file:///path/to/project/nested/.git/config',
 *     enabled: false,
 *   },
 * ];
 */
export type DuoProject = KhulnaSoftRemote & {
  /**
   * This is the pointer on the file system to the project.
   * eg. file:///User/username/gitlab-development-kit/gitlab/.git/config
   * This should match the `DocumentUri` of the document to check.
   *
   * @reference `DocumentUri` is the URI of the document to check. Comes from
   * the `TextDocument` object.
   */
  uri: string;
  /**
   * enabled: true if the project has Duo features enabled
   */
  enabled: boolean;
};

type WorkspaceFolderUri = string;

const duoFeaturesEnabledQuery = gql`
  query GetProject($projectPath: ID!) {
    project(fullPath: $projectPath) {
      duoFeaturesEnabled
    }
  }
`;

interface GitConfig {
  [section: string]: { [key: string]: string };
}

type GitlabRemoteAndFileUri = KhulnaSoftRemote & { fileUri: string };

export interface GqlProjectWithDuoEnabledInfo {
  duoFeaturesEnabled: boolean;
}

export interface DuoWorkspaceProjectAccessCache {
  getProjectsForWorkspaceFolder(workspaceFolder: WorkspaceFolder): DuoProject[];

  updateCache({
    baseUrl,
    workspaceFolders,
  }: {
    baseUrl: string;
    workspaceFolders: WorkspaceFolder[];
  }): Promise<void>;

  onDuoProjectCacheUpdate(listener: () => void): Disposable;
}

export const DuoWorkspaceProjectAccessCache = createInterfaceId<DuoWorkspaceProjectAccessCache>(
  'DuoWorkspaceProjectAccessCache',
);

@Injectable(DuoWorkspaceProjectAccessCache, [DirectoryWalker, FsClient, KhulnaSoftApiClient])
export class DefaultDuoWorkspaceProjectAccessCache {
  #duoProjects: Map<WorkspaceFolderUri, DuoProject[]>;

  #eventEmitter = new EventEmitter();

  constructor(
    private readonly directoryWalker: DirectoryWalker,
    private readonly fsClient: FsClient,
    private readonly api: KhulnaSoftApiClient,
  ) {
    this.#duoProjects = new Map<WorkspaceFolderUri, DuoProject[]>();
  }

  getProjectsForWorkspaceFolder(workspaceFolder: WorkspaceFolder): DuoProject[] {
    return this.#duoProjects.get(workspaceFolder.uri) ?? [];
  }

  async updateCache({
    baseUrl,
    workspaceFolders,
  }: {
    baseUrl: string;
    workspaceFolders: WorkspaceFolder[];
  }) {
    try {
      this.#duoProjects.clear();
      const duoProjects = await Promise.all(
        workspaceFolders.map(async (workspaceFolder) => {
          return {
            workspaceFolder,
            projects: await this.#duoProjectsForWorkspaceFolder({
              workspaceFolder,
              baseUrl,
            }),
          };
        }),
      );
      for (const { workspaceFolder, projects } of duoProjects) {
        this.#logProjectsInfo(projects, workspaceFolder);
        this.#duoProjects.set(workspaceFolder.uri, projects);
      }
      this.#triggerChange();
    } catch (err) {
      log.error('DuoWorkspaceProjectAccessCache: failed to update project access cache', err);
    }
  }

  #logProjectsInfo(projects: DuoProject[], workspaceFolder: WorkspaceFolder) {
    if (!projects.length) {
      log.warn(
        `DuoProjectAccessCache: no projects found for workspace folder ${workspaceFolder.uri}`,
      );
      return;
    }
    log.debug(
      `DuoProjectAccessCache: found ${projects.length} projects for workspace folder ${workspaceFolder.uri}: ${JSON.stringify(projects, null, 2)}`,
    );
  }

  async #duoProjectsForWorkspaceFolder({
    workspaceFolder,
    baseUrl,
  }: {
    workspaceFolder: WorkspaceFolder;
    baseUrl: string;
  }): Promise<DuoProject[]> {
    const remotes = await this.#gitlabRemotesForWorkspaceFolder(workspaceFolder, baseUrl);
    const projects = await Promise.all(
      remotes.map(async (remote) => {
        const enabled = await this.#checkDuoFeaturesEnabled(remote.namespaceWithPath);
        return {
          projectPath: remote.projectPath,
          uri: remote.fileUri,
          enabled,
          host: remote.host,
          namespace: remote.namespace,
          namespaceWithPath: remote.namespaceWithPath,
        } satisfies DuoProject;
      }),
    );
    return projects;
  }

  async #gitlabRemotesForWorkspaceFolder(
    workspaceFolder: WorkspaceFolder,
    baseUrl: string,
  ): Promise<GitlabRemoteAndFileUri[]> {
    const paths = await this.directoryWalker.findFilesForDirectory({
      directoryUri: parseURIString(workspaceFolder.uri),
      filters: {
        fileEndsWith: ['/.git/config'],
      },
    });
    const remotes = await Promise.all(
      paths.map(async (fileUri) => this.#gitlabRemotesForFileUri(fileUri, baseUrl)),
    );
    return remotes.flat();
  }

  async #gitlabRemotesForFileUri(fileUri: URI, baseUrl: string): Promise<GitlabRemoteAndFileUri[]> {
    const remoteUrls = await this.#remoteUrlsFromGitConfig(fileUri);
    return remoteUrls.reduce<GitlabRemoteAndFileUri[]>((acc, remoteUrl) => {
      const remote = parseKhulnaSoftRemote(remoteUrl, baseUrl);
      if (remote) {
        acc.push({ ...remote, fileUri: fileUri.toString() });
      }
      return acc;
    }, []);
  }

  async #remoteUrlsFromGitConfig(fileUri: URI): Promise<string[]> {
    try {
      const { readFile } = this.fsClient.promises;
      const fileString = (await readFile(fileUri.fsPath)).toString('utf-8');
      const config = ini.parse(fileString);
      return this.#getRemoteUrls(config);
    } catch (error) {
      log.error(`DuoProjectAccessCache: Failed to read git config file: ${fileUri}`, error);
      return [];
    }
  }

  #getRemoteUrls(config: GitConfig): string[] {
    return Object.keys(config).reduce<string[]>((acc, section) => {
      if (section.startsWith('remote ')) {
        acc.push(config[section].url);
      }
      return acc;
    }, []);
  }

  async #checkDuoFeaturesEnabled(projectPath: string): Promise<boolean> {
    try {
      const response = await this.api.fetchFromApi<{ project: GqlProjectWithDuoEnabledInfo }>({
        type: 'graphql',
        query: duoFeaturesEnabledQuery,
        variables: {
          projectPath,
        },
      } satisfies ApiRequest<{ project: GqlProjectWithDuoEnabledInfo }>);
      return Boolean(response?.project?.duoFeaturesEnabled);
    } catch (error) {
      log.error(
        `DuoProjectAccessCache: Failed to check if Duo features are enabled for project: ${projectPath}`,
        error,
      );
      return true;
    }
  }

  onDuoProjectCacheUpdate(
    listener: (duoProjectsCache: Map<WorkspaceFolderUri, DuoProject[]>) => void,
  ): Disposable {
    this.#eventEmitter.on(DUO_PROJECT_CACHE_UPDATE_EVENT, listener);
    return {
      dispose: () => this.#eventEmitter.removeListener(DUO_PROJECT_CACHE_UPDATE_EVENT, listener),
    };
  }

  #triggerChange() {
    this.#eventEmitter.emit(DUO_PROJECT_CACHE_UPDATE_EVENT, this.#duoProjects);
  }
}

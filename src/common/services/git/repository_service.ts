// Note: we polyfill the "path" import to use `path-browserify` to work in Web IDE.
// See `scripts/esbuild/helpers.ts` `pathImportPlugin` for details.
import { EventEmitter } from 'events';
import type { lstat } from 'node:fs/promises';
import path from 'path';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Disposable, FileChangeType, WorkspaceFolder } from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import { minimatch } from 'minimatch';
import PQueue from 'p-queue';
import { LsFetch } from '../../fetch';
import { log } from '../../log';
import { DirectoryWalker } from '../fs';
import { FastDirectoryMatcher } from '../fs/dir_matcher';
import { fsPathToUri, parseURIString } from '../fs/utils';
import {
  DefaultVirtualFileSystemService,
  VirtualFileSystemEvents,
  VirtualFileSystemService,
  WorkspaceFilesUpdate,
  WorkspaceFileUpdate,
} from '../fs/virtual_file_system_service';
import { FsClient } from '../fs/fs';
import { GetFileOptions, Repository, RepositoryFile } from './repository';
import { COMMON_PATHS_PATTERN } from './glob_settings';

type RepoUriString = string;
type FolderUriString = string;

type RepositoryMap = Map<RepoUriString, Repository>;

export interface RepositoryService extends DefaultRepositoryService {}

export const RepositoryService = createInterfaceId<RepositoryService>('RepositoryService');

/**
 * RepositoryService is responsible for managing and detecting repositories in a workspace.
 * This is considered the SSOT (Single Source of Truth) for repository state in a workspace.
 * TODO: Migrate `DuoProjectAccessCache` and `DuoProjectAccessService` to this service.
 *
 * @see `Repository` - Stateful class representing a git repository.
 * @see `GitIgnoreManager` - Manages gitignore files for a repository.
 */
@Injectable(RepositoryService, [VirtualFileSystemService, DirectoryWalker, FsClient, LsFetch])
export class DefaultRepositoryService {
  #virtualFileSystemService: DefaultVirtualFileSystemService;

  #directoryWalker: DirectoryWalker;

  #fsClient: FsClient;

  #lsFetch: LsFetch;

  #eventEmitter = new EventEmitter();

  #fileChangeQueue = new PQueue({ concurrency: 1 });

  #setWorkspaceRepositoriesQueueMap: Map<FolderUriString, PQueue>;

  /**
   * map of workspace folders to a directory matcher
   * The directory matcher is used to match repository URIs against file URIs
   * to determine if the file belongs to a repository.
   */
  #workspaceToRepositories: Map<
    FolderUriString,
    { fastDirectoryMatcher: FastDirectoryMatcher; repositories: RepositoryMap }
  >;

  constructor(
    virtualFileSystemService: DefaultVirtualFileSystemService,
    directoryWalker: DirectoryWalker,
    fsClient: FsClient,
    lsFetch: LsFetch,
  ) {
    this.#virtualFileSystemService = virtualFileSystemService;
    this.#directoryWalker = directoryWalker;
    this.#fsClient = fsClient;
    this.#lsFetch = lsFetch;
    this.#workspaceToRepositories = new Map();
    this.#setWorkspaceRepositoriesQueueMap = new Map();
    this.#setupEventListeners();
  }

  onWorkspaceRepositoriesSet(listener: (workspaceFolder: WorkspaceFolder) => void): Disposable {
    this.#eventEmitter.on('workspaceRepositoriesSet', listener);
    return {
      dispose: () => this.#eventEmitter.removeListener('workspaceRepositoriesSet', listener),
    };
  }

  #triggerWorkspaceRepositoriesSet(workspaceFolder: WorkspaceFolder) {
    this.#eventEmitter.emit('workspaceRepositoriesSet', workspaceFolder);
  }

  #setupEventListeners() {
    return this.#virtualFileSystemService.onFileSystemEvent(async (eventType, data) => {
      switch (eventType) {
        case VirtualFileSystemEvents.WorkspaceFilesEvent:
          await this.#queueSetWorkspaceRepositories(
            data.workspaceFolder,
            data as WorkspaceFilesUpdate,
          );
          break;
        case VirtualFileSystemEvents.WorkspaceFileEvent:
          await this.#fileChangeQueue.add(() =>
            this.#handleWorkspaceFileUpdate(data as WorkspaceFileUpdate),
          );
          break;
        default:
          break;
      }
    });
  }

  async #queueSetWorkspaceRepositories(
    workspaceFolder: WorkspaceFolder,
    data: WorkspaceFilesUpdate,
  ): Promise<void> {
    const queue =
      this.#setWorkspaceRepositoriesQueueMap.get(workspaceFolder.uri) ||
      new PQueue({ concurrency: 1 });
    await queue.add(() => this.#setWorkspaceRepositories({ workspaceFolder, files: data.files }));
    this.#setWorkspaceRepositoriesQueueMap.set(workspaceFolder.uri, queue);
    return queue.onIdle();
  }

  /**
   * ------------------------------
   * EVENT HANDLERS
   * ------------------------------
   */

  /**
   * Clear existing repositories from workspace and detect new repositories.
   * This can either be triggered by a workspace Files event by the VFS or by a git config file change (.git/config or .gitignore)
   */
  async #setWorkspaceRepositories({
    workspaceFolder,
    files: workspaceFiles,
  }: WorkspaceFilesUpdate) {
    // pause the file change queue to prevent race conditions, since this method
    // is constructing the new state of the workspace and its repositories
    this.#fileChangeQueue.pause();
    // TODO: send LSP notification to client indicating progress
    // https://gitlab.com/gitlab-org/gitlab/-/issues/489467

    // first clear existing repositories from workspace
    log.info(`[RepositoryService] Clearing repositories for workspace ${workspaceFolder.uri}`);
    this.#clearRepositoriesForWorkspace(workspaceFolder.uri);

    const repositories = this.#detectRepositories(workspaceFiles, workspaceFolder);
    log.info(
      `[RepositoryService] Detected ${repositories.length} repositories for workspace ${workspaceFolder.uri}`,
    );

    for (const repository of repositories) {
      this.#addRepositoryToWorkspace(workspaceFolder, repository);
    }
    log.info(
      `[RepositoryService] Added ${repositories.length} repositories to workspace ${workspaceFolder.uri}`,
    );

    await this.#addFilesToRepositories(workspaceFiles, workspaceFolder);

    this.#triggerWorkspaceRepositoriesSet(workspaceFolder);
    this.#fileChangeQueue.start();
  }

  async #handleWorkspaceFileUpdate({ fileEvent, workspaceFolder }: WorkspaceFileUpdate) {
    try {
      const fileUri = parseURIString(fileEvent.uri);
      if (this.#shouldSkipFile(fileUri)) {
        log.debug(`[RepositoryService] Skipping file ${fileUri.toString()}`);
        return;
      }
      // we don't support building repositories from file events
      // this is handled by the workspace files event
      const repository = this.getMatchingRepository(fileUri, workspaceFolder.uri);
      if (!repository) {
        log.debug(
          `[RepositoryService] No matching repository found for file ${fileUri.toString()}`,
        );
        return;
      }

      if (!repository) {
        log.debug(`[RepositoryService] Repository not found for URI ${fileUri.toString()}`);
        return;
      }

      // if the file is a git config or gitignore file, we treat this as a workspace state change
      // this way we re-detect repositories and add/update files in them, as any git change
      // marks the current state as stale
      if (Repository.isGitConfigFile(fileUri) || Repository.isGitIgnoreFile(fileUri)) {
        log.info(
          `[RepositoryService] File ${fileUri.toString()} is a git config or gitignore file, updating workspace files`,
        );
        await this.#handleWorkspaceFolderStateChange(workspaceFolder);
        return;
      }

      // if the file change is in a git folder, we need to refresh the tracked files
      if (Repository.isInGitFolder(fileUri)) {
        await repository.refreshTrackedFiles();
      }

      // if change event is the repository root, trigger a workspace state change
      if (this.getRepositoriesForWorkspace(workspaceFolder.uri).has(fileUri.toString())) {
        log.debug(`[RepositoryService] user changed repository root ${fileUri.toString()}`);
        await this.#handleWorkspaceFolderStateChange(workspaceFolder);
        return;
      }

      switch (fileEvent.type) {
        case FileChangeType.Created:
          if (await this.#isDirectory(fileUri, fileEvent.type, workspaceFolder)) {
            log.debug(
              `[RepositoryService] Directory ${fileUri.toString()} created in workspace ${workspaceFolder.uri}`,
            );
            await this.#handleDirectory(fileUri, workspaceFolder, fileEvent.type);
          } else {
            const file = repository.setFile(fileUri);
            this.#setDirectoryForFile(file, repository);
            log.debug(
              `[RepositoryService] File ${fileUri.toString()} added to repository ${repository.uri.toString()}`,
            );
          }
          break;

        case FileChangeType.Changed: {
          const file = repository.setFile(fileUri);
          this.#setDirectoryForFile(file, repository);
          log.debug(
            `[RepositoryService] File ${fileUri.toString()} updated in repository ${repository.uri.toString()}`,
          );
          break;
        }
        case FileChangeType.Deleted: {
          if (await this.#isDirectory(fileUri, fileEvent.type, workspaceFolder)) {
            log.debug(
              `[RepositoryService] Directory ${fileUri.toString()} deleted in workspace ${workspaceFolder.uri}`,
            );
            await this.#handleDirectory(fileUri, workspaceFolder, fileEvent.type);
          } else {
            repository.removeFile(fileUri);
            log.debug(
              `[RepositoryService] File ${fileUri.toString()} removed from repository ${repository.uri.toString()}`,
            );
          }
          break;
        }
        default:
          log.warn(
            `[RepositoryService] Unknown file event ${fileEvent.type} for file ${fileUri.toString()}`,
          );
      }
    } catch (error) {
      log.error(`[RepositoryService] Error handling file update ${fileEvent.uri}`, error);
    }
  }

  async #handleWorkspaceFolderStateChange(workspaceFolder: WorkspaceFolder) {
    const filesForWorkspace = await this.#directoryWalker.findFilesForDirectory({
      directoryUri: parseURIString(workspaceFolder.uri),
    });
    log.info(
      `[RepositoryService] Found ${filesForWorkspace.length} files for workspace ${workspaceFolder.uri}`,
    );
    await this.#queueSetWorkspaceRepositories(workspaceFolder, {
      workspaceFolder,
      files: filesForWorkspace,
    });
  }

  /**
   * TODO: make this configurable. https://gitlab.com/gitlab-org/gitlab/-/issues/485509
   * minimatch handles multiple operating system path separators,
   * so we match against the file system path instead of the URI
   */
  #shouldSkipFile(fileUri: URI): boolean {
    return minimatch(fileUri.fsPath, COMMON_PATHS_PATTERN);
  }

  /**
   * We listen for file changes based on the `didChangeWatchedFiles` notification.
   * https://github.com/microsoft/vscode/issues/60813
   * This method is used to determine if a file is a directory because the watcher
   * may emit deletion events for directories, not individual files.
   *
   * eg: it may return `file:///path/to/directory` as a URI
   */
  async #isDirectory(
    fileUri: URI,
    changeType: FileChangeType,
    workspaceFolder: WorkspaceFolder,
  ): Promise<boolean> {
    switch (changeType) {
      case FileChangeType.Deleted: {
        return Boolean(
          this.getMatchingRepository(fileUri, workspaceFolder.uri)?.getDirectory(fileUri, {
            excludeGitFolder: false,
            excludeIgnored: false,
          }),
        );
      }
      case FileChangeType.Created: {
        const lstatFn = this.#fsClient.promises.lstat as typeof lstat;
        const stats = await lstatFn(fileUri.fsPath, { bigint: false });
        return stats.isDirectory();
      }
      default:
        return false;
    }
  }

  async #handleDirectory(uri: URI, workspaceFolder: WorkspaceFolder, changeType: FileChangeType) {
    switch (changeType) {
      case FileChangeType.Deleted:
        await this.#deleteFilesForDirectory(uri, workspaceFolder);
        break;
      case FileChangeType.Created:
        await this.#addFilesForDirectory(uri, workspaceFolder);
        break;
      default:
        break;
    }
  }

  #setDirectoryForFile(file: RepositoryFile, repository: Repository) {
    let currentPath = path.dirname(file.uri.fsPath);
    try {
      // Skip paths until we reach the repository root
      while (
        currentPath.startsWith(repository.uri.fsPath) &&
        currentPath !== repository.uri.fsPath
      ) {
        const dirUri = fsPathToUri(currentPath);
        // Skip if directory already exists
        if (!repository.getDirectory(dirUri, { excludeGitFolder: false, excludeIgnored: false })) {
          repository.setDirectory(dirUri);
        }
        currentPath = path.dirname(currentPath);
      }
    } catch (error) {
      log.error(
        `[RepositoryService] Error setting directory for file ${currentPath.toString()}`,
        error,
      );
    }
  }

  async #addFilesForDirectory(dirUri: URI, workspaceFolder: WorkspaceFolder) {
    const files = await this.#directoryWalker.findFilesForDirectory({
      directoryUri: dirUri,
    });
    const promises = files.map((file) =>
      this.#handleWorkspaceFileUpdate({
        fileEvent: {
          type: FileChangeType.Created,
          uri: file.toString(),
        },
        workspaceFolder,
      }),
    );
    await Promise.all(promises);
    const repository = this.getMatchingRepository(dirUri, workspaceFolder.uri);
    if (repository) {
      repository.setDirectory(dirUri);
    }
  }

  async #deleteFilesForDirectory(dirUri: URI, workspaceFolder: WorkspaceFolder) {
    const repository = this.getMatchingRepository(dirUri, workspaceFolder.uri);
    if (repository) {
      const deletedFiles = repository.removeFilesUnderDirectory(dirUri);
      const gitRelatedFiles = [];
      for (const file of deletedFiles) {
        if (Repository.isGitConfigFile(file.uri) || Repository.isGitIgnoreFile(file.uri)) {
          gitRelatedFiles.push(file.uri);
        }
        log.debug(
          `[RepositoryService] File ${file.uri.toString()} removed from repository ${repository.uri.toString()}`,
        );
      }
      if (gitRelatedFiles.length) {
        log.info(
          `[RepositoryService] Git related files removed from repository ${repository.uri.toString()}, updating workspace files`,
        );
        await this.#handleWorkspaceFolderStateChange(workspaceFolder);
      }
    }
  }

  #getFilesByRepositories(
    files: URI[],
    workspaceFolder: WorkspaceFolder,
  ): Map<RepoUriString, Map<string, URI>> {
    const filesByRepositories = new Map<RepoUriString, Map<string, URI>>();

    for (const file of files) {
      const repoUri = this.#getRepositoryUriForFile(file, workspaceFolder.uri);
      if (repoUri) {
        const repoUriString = repoUri.toString();
        const repoFiles = filesByRepositories.get(repoUriString) ?? new Map();
        repoFiles.set(file.toString(), file);
        filesByRepositories.set(repoUriString, repoFiles);
      }
    }

    return filesByRepositories;
  }

  /**
   * ------------------------------
   * CLIENT FACING METHODS
   * ------------------------------
   */
  getMatchingRepository(fileUri: URI, workspaceFolderUri: FolderUriString): Repository | undefined {
    const repositoryUri = this.#getRepositoryUriForFile(fileUri, workspaceFolderUri);
    if (!repositoryUri) {
      return undefined;
    }
    const repository = this.getRepositoriesForWorkspace(workspaceFolderUri).get(
      repositoryUri.toString(),
    );
    return repository;
  }

  getRepositoryFileForUri(
    fileUri: URI,
    repositoryUri: URI,
    workspaceFolder: WorkspaceFolder,
  ): RepositoryFile | null {
    const repository = this.getRepositoryForWorkspace(workspaceFolder.uri, repositoryUri);
    return repository?.getFile(fileUri) ?? null;
  }

  getCurrentFilesForRepository(
    repositoryUri: URI,
    workspaceFolderUri: FolderUriString,
    options: GetFileOptions = {},
  ): RepositoryFile[] {
    const repository = this.getRepositoryForWorkspace(workspaceFolderUri, repositoryUri);
    if (!repository) {
      return [];
    }
    return repository.getCurrentTreeFiles(options);
  }

  getCurrentFilesForWorkspace(
    workspaceFolderUri: FolderUriString,
    options: GetFileOptions = {},
  ): RepositoryFile[] {
    const repositories = this.getRepositoriesForWorkspace(workspaceFolderUri);
    const allFiles: RepositoryFile[] = [];
    repositories.forEach((repository) => {
      repository.getCurrentTreeFiles(options).forEach((file) => {
        allFiles.push(file);
      });
    });
    return allFiles;
  }

  getRepositoriesForWorkspace(workspaceFolderUri: FolderUriString): RepositoryMap {
    return this.#workspaceToRepositories.get(workspaceFolderUri)?.repositories || new Map();
  }

  getRepositoryForWorkspace(
    workspaceFolderUri: FolderUriString,
    repositoryUri: URI,
  ): Repository | undefined {
    return this.getRepositoriesForWorkspace(workspaceFolderUri).get(repositoryUri.toString());
  }

  /**
   * ------------------------------
   * STATE MANAGEMENT
   * ------------------------------
   */
  #addRepositoryToWorkspace(workspaceFolder: WorkspaceFolder, repository: Repository) {
    const { fastDirectoryMatcher, repositories } = this.#workspaceToRepositories.get(
      workspaceFolder.uri,
    ) || {
      fastDirectoryMatcher: new FastDirectoryMatcher(),
      repositories: new Map(),
    };
    log.info(
      `[RepositoryService] Adding repository ${repository.uri} to workspace ${workspaceFolder.uri}`,
    );
    fastDirectoryMatcher.addDirectoryToMatch(repository.uri);
    repositories.set(repository.uri.toString(), repository);
    this.#workspaceToRepositories.set(workspaceFolder.uri, {
      fastDirectoryMatcher,
      repositories,
    });
  }

  async #addFilesToRepositories(files: URI[], workspaceFolder: WorkspaceFolder) {
    const repositoryMap = this.getRepositoriesForWorkspace(workspaceFolder.uri);
    const filesByRepositories = this.#getFilesByRepositories(files, workspaceFolder);

    const setupAndAddFiles = async ([repositoryUri, repoFiles]: [
      RepoUriString,
      Map<string, URI>,
    ]) => {
      const repository = repositoryMap.get(repositoryUri);
      if (!repository) return 0;
      const repoFileArray = Array.from(repoFiles.values());
      const fileCount = repoFileArray.length;

      const gitFiles = await repository.setupGitForRepository(repoFileArray);
      if (gitFiles instanceof Error) {
        log.warn(
          `[RepositoryService] Error setting up git for repository ${repository.uri.toString()}: ${gitFiles.message}`,
          gitFiles,
        );
        return 0;
      }
      log.debug(
        `[RepositoryService] Added ${gitFiles.ignoreFiles.size} gitignores to repository ${repository.uri}`,
      );
      log.debug(
        `[RepositoryService] Added ${gitFiles.trackedFiles.size} tracked files to repository ${repository.uri}`,
      );
      if (gitFiles.excludeFile) {
        log.debug(
          `[RepositoryService] Added ${gitFiles.excludeFile.toString()} to repository ${repository.uri}`,
        );
      }

      repoFileArray.forEach((repoFile) => {
        const file = repository.setFile(repoFile);
        this.#setDirectoryForFile(file, repository);
      });

      log.debug(`[RepositoryService] Added ${fileCount} files to repository ${repository.uri}`);

      return fileCount;
    };

    const results = await Promise.all(Array.from(filesByRepositories).map(setupAndAddFiles));
    const totalFiles = results.reduce((sum, count) => sum + count, 0);

    log.debug(`[RepositoryService] Total files added: ${totalFiles}`);
  }

  #getRepositoryUriForFile(fileUri: URI, workspaceFolderUri: FolderUriString): URI | undefined {
    const directoryMatcher = this.#getDirectoryMatcherForWorkspace(workspaceFolderUri);
    const repositoryUris = directoryMatcher.findMatchingDirectories(fileUri);
    if (!repositoryUris?.length) {
      log.warn(`[RepositoryService] No matching repository found for file ${fileUri.toString()}`);
      return undefined;
    }
    // the directory matcher returns the directories in order from shallow to deep
    // so we always return the deepest repository uri
    return repositoryUris.at(-1);
  }

  #getDirectoryMatcherForWorkspace(workspaceFolderUri: FolderUriString): FastDirectoryMatcher {
    return (
      this.#workspaceToRepositories.get(workspaceFolderUri)?.fastDirectoryMatcher ||
      new FastDirectoryMatcher()
    );
  }

  #clearRepositoriesForWorkspace(workspaceFolderUri: FolderUriString): void {
    log.debug(`[RepositoryService] Emptying repositories for workspace ${workspaceFolderUri}`);
    const directoryMatcher = this.#getDirectoryMatcherForWorkspace(workspaceFolderUri);
    directoryMatcher.dispose();
    this.#workspaceToRepositories.delete(workspaceFolderUri);
    const repositoryMap = this.getRepositoriesForWorkspace(workspaceFolderUri);
    repositoryMap.forEach((repo) => {
      repo.dispose();
      log.debug(`[RepositoryService] Repository ${repo.uri} has been disposed`);
    });
    repositoryMap.clear();
    this.#workspaceToRepositories.delete(workspaceFolderUri);
    log.debug(
      `[RepositoryService] Repositories for workspace ${workspaceFolderUri} have been emptied`,
    );
  }

  /**
   *------------------------------
   * GIT RELATED OPERATIONS
   * ------------------------------
   */

  /**
   * Detects repositories in the workspace by finding .git/config files.
   * For each .git/config file, it creates a repository object.
   * It also reads the gitignore files and adds them to the repository's ignore manager.
   */
  #detectRepositories(files: URI[], workspaceFolder: WorkspaceFolder): Repository[] {
    const gitConfigFiles = files.filter((file) => Repository.isGitConfigFile(file));
    return gitConfigFiles.map((file) => {
      log.info(`[RepositoryService] Detected repository at ${file.toString()}`);
      return new Repository({
        uri: Repository.getRepoRootFromGitConfig(file),
        configFileUri: file,
        workspaceFolder,
        fsClient: this.#fsClient,
        lsFetch: this.#lsFetch,
      });
    });
  }
}

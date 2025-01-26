import { EventEmitter } from 'events';
import {
  DidChangeWatchedFilesNotification,
  DidChangeWatchedFilesRegistrationOptions,
  Disposable,
  FileEvent,
  WorkspaceFolder,
} from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { LsConnection } from '../../external_interfaces';
import { FeatureFlagService, InstanceFeatureFlags } from '../../feature_flags';
import { log } from '../../log';
import { ConfigService } from '../../config_service';
import { DirectoryWalker } from './dir';
import { parseURIString } from './utils';

export type WorkspaceFileUpdate = {
  fileEvent: FileEvent;
  workspaceFolder: WorkspaceFolder;
};

export type WorkspaceFilesUpdate = {
  files: URI[];
  workspaceFolder: WorkspaceFolder;
};

export enum VirtualFileSystemEvents {
  WorkspaceFileEvent = 'workspaceFileEvent',
  WorkspaceFilesEvent = 'workspaceFilesEvent',
}
const FILE_SYSTEM_EVENT_NAME = 'fileSystemEvent';

export interface FileSystemEventMap {
  [VirtualFileSystemEvents.WorkspaceFileEvent]: WorkspaceFileUpdate;
  [VirtualFileSystemEvents.WorkspaceFilesEvent]: WorkspaceFilesUpdate;
}

export interface FileSystemEventListener {
  <T extends VirtualFileSystemEvents>(eventType: T, data: FileSystemEventMap[T]): void;
}

export interface VirtualFileSystemService extends DefaultVirtualFileSystemService {}

export const VirtualFileSystemService = createInterfaceId<VirtualFileSystemService>(
  'VirtualFileSystemService',
);

const getMatchingWorkspaceFolders = (
  fileUri: string,
  workspaceFolders: WorkspaceFolder[],
): WorkspaceFolder[] => workspaceFolders.filter((wf) => fileUri.startsWith(wf.uri));

@Injectable(VirtualFileSystemService, [
  LsConnection,
  DirectoryWalker,
  ConfigService,
  FeatureFlagService,
])
export class DefaultVirtualFileSystemService {
  #lsConnection: LsConnection;

  #directoryWalker: DirectoryWalker;

  #configService: ConfigService;

  #emitter = new EventEmitter();

  #watchersDisposables?: Disposable[];

  #featureFlagService: FeatureFlagService;

  #initializedWorkspaceFolders = new Set<string>();

  constructor(
    lsConnection: LsConnection,
    directoryWalker: DirectoryWalker,
    configService: ConfigService,
    featureFlagService: FeatureFlagService,
  ) {
    this.#lsConnection = lsConnection;
    this.#directoryWalker = directoryWalker;
    this.#configService = configService;
    this.#featureFlagService = featureFlagService;
  }

  #handleFileEvent(event: FileEvent) {
    const workspaceFolders = this.#configService.get('client.workspaceFolders') ?? [];
    const matchingWorkspaceFolders = getMatchingWorkspaceFolders(event.uri, workspaceFolders);
    for (const workspaceFolder of matchingWorkspaceFolders) {
      this.#emitFileSystemEvent(VirtualFileSystemEvents.WorkspaceFileEvent, {
        fileEvent: event,
        workspaceFolder,
      });
    }
  }

  async setup() {
    // Ensure flags are in correct state before continuing, since this can run early on init
    // and the network request may not yet have completed.
    await this.#featureFlagService.updateInstanceFeatureFlags();

    if (
      !this.#featureFlagService.isInstanceFlagEnabled(InstanceFeatureFlags.DuoAdditionalContext)
    ) {
      return;
    }

    const workspaceFolders = this.#configService.get('client')?.workspaceFolders ?? [];

    const workspaceFolderFileEmits = workspaceFolders
      .filter((folder) => !this.#initializedWorkspaceFolders.has(folder.uri))
      .map(async (folder) => {
        this.#initializedWorkspaceFolders.add(folder.uri);
        return this.emitFilesForWorkspace(folder);
      });

    const configFolders = new Set(workspaceFolders.map((wf) => wf.uri));
    for (const uri of this.#initializedWorkspaceFolders) {
      if (!configFolders.has(uri)) {
        // URI has previously been initialized but is not in the latest clientConfig - so removed from workspace.
        // Remove it from set to ensure it will be initialized if it is re-added to workspace
        this.#initializedWorkspaceFolders.delete(uri);
      }
    }

    await Promise.all([...workspaceFolderFileEmits, this.registerWatchers()]);
  }

  /**
   * Emits a workspace files update event for the given workspace folder.
   * This is used to notify consumers of the virtual file system that the files in the workspace have changed.
   */
  async emitFilesForWorkspace(workspaceFolder: WorkspaceFolder): Promise<void> {
    try {
      log.info(`[VirtualFileSystemService] Emitting files for workspace ${workspaceFolder.uri}`);
      const files = await this.#directoryWalker.findFilesForDirectory({
        directoryUri: parseURIString(workspaceFolder.uri),
      });
      this.#emitFileSystemEvent(VirtualFileSystemEvents.WorkspaceFilesEvent, {
        files,
        workspaceFolder,
      });
    } catch (error) {
      log.info(`Failed to emit files for workspace ${workspaceFolder.uri}`, error);
    }
  }

  /**
   * Registers watchers for the workspace folders.
   * https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_didChangeWatchedFiles
   */
  async registerWatchers() {
    if (this.#watchersDisposables) {
      this.#watchersDisposables.forEach((disposable) => disposable.dispose());
    }
    log.info('[VirtualFileSystemService] Registering watchers');
    try {
      this.#watchersDisposables = [
        await this.#lsConnection.client.register(DidChangeWatchedFilesNotification.type, {
          watchers: [
            {
              globPattern: '**/*',
            },
          ],
        } satisfies DidChangeWatchedFilesRegistrationOptions),
        this.#lsConnection.onDidChangeWatchedFiles(({ changes }) => {
          for (const change of changes) {
            this.#handleFileEvent(change);
          }
        }),
      ];
    } catch (error) {
      log.info(`Failed to register watcher for workspaces`, error);
    }
  }

  #emitFileSystemEvent<T extends VirtualFileSystemEvents>(
    eventType: T,
    data: FileSystemEventMap[T],
  ) {
    this.#emitter.emit(FILE_SYSTEM_EVENT_NAME, eventType, data);
  }

  /**
   * Adds a listener for the file system event.
   * This can be of type `WorkspaceFileUpdate` or `WorkspaceFilesUpdate`.
   *
   * @param listener - The listener to add.
   * @returns A disposable object that can be used to remove the listener.
   */
  onFileSystemEvent(listener: FileSystemEventListener) {
    this.#emitter.on(FILE_SYSTEM_EVENT_NAME, listener);
    return {
      dispose: () => this.#emitter.removeListener(FILE_SYSTEM_EVENT_NAME, listener),
    };
  }
}

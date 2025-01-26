import { EventEmitter } from 'events';
import { URI, WorkspaceFolder } from 'vscode-languageserver-protocol';
import { Disposable } from '@khulnasoft/disposable';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentService } from '../document_service';
import { ConfigService, ClientConfig } from '../config_service';
import { TextDocumentChangeListenerType } from '../text_document_change_listener_type';
import { DuoWorkspaceProjectAccessCache, DuoProjectAccessChecker } from '../services/duo_access';
import { DuoProjectStatus } from '../services/duo_access/project_access_checker';
import { StateCheck, StateCheckChangedEventData, StateConfigCheck } from './state_check';
import {
  DUO_DISABLED_FOR_PROJECT,
  FeatureStateCheck,
  StateCheckId,
} from './feature_state_management_types';

export type ProjectDuoAccessCheck = StateCheck<typeof DUO_DISABLED_FOR_PROJECT> & StateConfigCheck;

export const ProjectDuoAccessCheck =
  createInterfaceId<ProjectDuoAccessCheck>('ProjectDuoAccessCheck');

@Injectable(ProjectDuoAccessCheck, [
  DocumentService,
  ConfigService,
  DuoProjectAccessChecker,
  DuoWorkspaceProjectAccessCache,
])
export class DefaultProjectDuoAccessCheck implements ProjectDuoAccessCheck {
  #subscriptions: Disposable[] = [];

  #stateEmitter = new EventEmitter();

  #hasDuoAccess?: boolean;

  #duoProjectAccessChecker: DuoProjectAccessChecker;

  #configService: ConfigService;

  #currentDocument?: TextDocument;

  #isEnabledInSettings = true;

  constructor(
    documentService: DocumentService,
    configService: ConfigService,
    duoProjectAccessChecker: DuoProjectAccessChecker,
    duoProjectAccessCache: DuoWorkspaceProjectAccessCache,
  ) {
    this.#configService = configService;
    this.#duoProjectAccessChecker = duoProjectAccessChecker;

    this.#subscriptions.push(
      documentService.onDocumentChange(async (event, handlerType) => {
        if (handlerType === TextDocumentChangeListenerType.onDidSetActive) {
          this.#currentDocument = event.document;

          await this.#checkIfProjectHasDuoAccess();
        }
      }),

      configService.onConfigChange(async (config) => {
        this.#isEnabledInSettings = Boolean(config.client.duo?.enabledWithoutGitlabProject);

        await this.#checkIfProjectHasDuoAccess();
      }),

      duoProjectAccessCache.onDuoProjectCacheUpdate(() => this.#checkIfProjectHasDuoAccess()),
    );
  }

  async init() {
    await this.#checkIfProjectHasDuoAccess();
  }

  onChanged(listener: (data: StateCheckChangedEventData) => void): Disposable {
    this.#stateEmitter.on('change', listener);
    return {
      dispose: () => this.#stateEmitter.removeListener('change', listener),
    };
  }

  get engaged() {
    return !this.#hasDuoAccess;
  }

  async #checkIfProjectHasDuoAccess(): Promise<void> {
    this.#hasDuoAccess = this.#isEnabledInSettings;

    if (!this.#currentDocument) {
      this.#stateEmitter.emit('change', this);
      return;
    }

    const workspaceFolder = await this.#getWorkspaceFolderForUri(this.#currentDocument.uri);

    if (workspaceFolder) {
      const result = this.#duoProjectAccessChecker.checkProjectStatus(
        this.#currentDocument.uri,
        workspaceFolder,
      );

      if (result?.status === DuoProjectStatus.DuoEnabled) {
        this.#hasDuoAccess = true;
      } else if (result?.status === DuoProjectStatus.DuoDisabled) {
        this.#hasDuoAccess = false;
      }
    }

    this.#stateEmitter.emit('change', this);
  }

  id = DUO_DISABLED_FOR_PROJECT;

  details = 'Duo features are disabled for this project';

  async #getWorkspaceFolderForUri(uri: URI): Promise<WorkspaceFolder | undefined> {
    const workspaceFolders = await this.#configService.get('client.workspaceFolders');

    return workspaceFolders?.find((folder) => uri.startsWith(folder.uri));
  }

  dispose() {
    this.#subscriptions.forEach((s) => s.dispose());
  }

  async validate(config: ClientConfig): Promise<FeatureStateCheck<StateCheckId> | undefined> {
    if (config.duo?.enabledWithoutGitlabProject === true) {
      return undefined;
    }

    const workspaceFolders = config.workspaceFolders ?? [];
    const projectsWithDuoFeaturesDisabled = workspaceFolders
      .map((workspaceFolder) =>
        this.#duoProjectAccessChecker.checkProjectStatus(workspaceFolder.uri, workspaceFolder),
      )
      .filter((result) => result.status === DuoProjectStatus.DuoDisabled);

    if (projectsWithDuoFeaturesDisabled.length > 0) {
      const projectPaths = projectsWithDuoFeaturesDisabled
        .map((project) => project.project?.projectPath)
        .filter((path) => path !== undefined)
        .join(', ');

      return {
        checkId: this.id,
        details: `Duo features are disabled for one or more projects in the workspace. (${projectPaths})`,
        engaged: true,
      };
    }

    return undefined;
  }
}

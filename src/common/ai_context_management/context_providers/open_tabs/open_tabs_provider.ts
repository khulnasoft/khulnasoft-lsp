import { Injectable } from '@khulnasoft/di';
import { WorkspaceFolder } from 'vscode-languageserver';
import { Utils } from 'vscode-uri';
import type {
  AIContextItem,
  AIContextItemMetadata,
  AIContextSearchQuery,
  AIContextPolicyResponse,
} from '@khulnasoft/ai-context';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { log } from '../../../log';
import { OpenTabsService } from '../../../open_tabs/open_tabs_service';
import { DuoProjectAccessChecker } from '../../../services/duo_access';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../../../services/duo_access/duo_feature_access_service';
import { DuoProjectStatus } from '../../../services/duo_access/project_access_checker';
import type { DuoProject } from '../../../services/duo_access/workspace_project_access_cache';
import { parseURIString } from '../../../services/fs/utils';
import { isBinaryContent } from '../../../utils/binary_content';
import { AbstractAIContextProvider, CodeSuggestionsAIRequest } from '../../ai_context_provider';
import { FilePolicyProvider } from '../../context_policies/file_policy';
import { BINARY_FILE_DISABLED_REASON } from '../../context_transformers/ai_context_binary_file_transformer';
import { AIContextProvider } from '../..';
import { IDocContext } from '../../../document_transformer_service';

type OpenTabMetadata = AIContextItemMetadata & {
  subType: 'open_tab';
  iid?: string;
  title?: string;
  relativePath?: string;
  workspaceFolder?: WorkspaceFolder;
  project?: string;
  languageId: TextDocument['languageId'];
};

export type OpenTabAIContextItem = AIContextItem & {
  category: 'file';
  metadata: OpenTabMetadata;
};

export interface OpenTabContextProvider extends AbstractAIContextProvider<OpenTabAIContextItem> {}

@Injectable(AIContextProvider, [
  DuoProjectAccessChecker,
  FilePolicyProvider,
  DuoFeatureAccessService,
  OpenTabsService,
])
export class DefaultOpenTabContextProvider
  extends AbstractAIContextProvider<OpenTabAIContextItem>
  implements OpenTabContextProvider
{
  #projectAccessChecker: DuoProjectAccessChecker;

  #openTabsService: OpenTabsService;

  #policy: FilePolicyProvider;

  duoRequiredFeature = DuoFeature.IncludeFileContext;

  constructor(
    projectAccessChecker: DuoProjectAccessChecker,
    policy: FilePolicyProvider,
    duoFeatureAccessService: DuoFeatureAccessService,
    openTabsService: OpenTabsService,
  ) {
    super('open_tab', duoFeatureAccessService);
    this.#policy = policy;
    this.#projectAccessChecker = projectAccessChecker;
    this.#openTabsService = openTabsService;

    this.canItemBeAdded = async (
      contextItem: OpenTabAIContextItem,
    ): Promise<AIContextPolicyResponse> => {
      return this.#policy.isContextItemAllowed(contextItem.metadata.relativePath ?? '');
    };
  }

  async searchContextItems(query: AIContextSearchQuery): Promise<OpenTabAIContextItem[]> {
    if (query.query.trim() !== '') {
      return [];
    }
    return this.#getOpenFiles();
  }

  async getContextForCodeSuggestions({
    iDocContext,
  }: CodeSuggestionsAIRequest): Promise<OpenTabAIContextItem[]> {
    const openFiles = await this.#getOpenFiles(iDocContext);
    const withContentPromises = openFiles.map((file) => this.getItemWithContent(file));
    return Promise.all(withContentPromises);
  }

  async #getOpenFiles(iDocContext?: IDocContext): Promise<OpenTabAIContextItem[]> {
    const openFiles = this.#openTabsService.getOpenTabCache().mostRecentFiles({
      context: iDocContext,
      includeCurrentFile: !iDocContext,
    });

    log.debug(`[OpenTabContextProvider] context item search for ${this.type}`);
    const promises = openFiles.map(async (file) => {
      let project: DuoProject | undefined;
      const disabledReasons: string[] = [];

      const fileContent = file.prefix + file.suffix;
      if (isBinaryContent(fileContent)) {
        disabledReasons.push(BINARY_FILE_DISABLED_REASON);
      }

      if (file.workspaceFolder) {
        const { project: projectFromChecker, status } =
          this.#projectAccessChecker.checkProjectStatus(file.uri, file.workspaceFolder);
        project = projectFromChecker;
        if (status === DuoProjectStatus.DuoDisabled) {
          disabledReasons.push('project disabled');
        }
      }

      const { enabled: policyEnabled, disabledReasons: policyReasons = [] } =
        await this.#policy.isContextItemAllowed(file.fileRelativePath);
      if (!policyEnabled) {
        disabledReasons.push(...policyReasons);
      }

      const projectPath = project?.namespaceWithPath;

      const item = {
        id: file.uri,
        category: 'file' as const,
        metadata: {
          languageId: file.languageId,
          title: Utils.basename(parseURIString(file.uri)),
          project: projectPath ?? 'not a KhulnaSoft project',
          enabled: disabledReasons.length === 0,
          disabledReasons,
          icon: 'document',
          secondaryText: file.fileRelativePath,
          subType: 'open_tab' as const,
          subTypeLabel: 'Project file',
          relativePath: file.fileRelativePath,
          workspaceFolder: file.workspaceFolder ?? { name: '', uri: '' },
        },
      } satisfies OpenTabAIContextItem;

      log.debug(`[OpenTabContextProvider] open tab context item ${item.id} was found`);
      return item;
    });

    return Promise.all(promises);
  }

  async retrieveSelectedContextItemsWithContent(): Promise<OpenTabAIContextItem[]> {
    const items = await this.getSelectedContextItems();

    const itemsWithContentPromises = items.map((document) => {
      log.debug(
        `[OpenTabContextProvider] open tab context item ${document.id} was retrieved with content`,
      );
      return this.getItemWithContent(document);
    });

    return Promise.all(itemsWithContentPromises);
  }

  async getItemWithContent(item: OpenTabAIContextItem): Promise<OpenTabAIContextItem> {
    const itemFile = this.#openTabsService.getOpenTabCache().openFiles.get(item.id);
    if (itemFile) {
      return {
        ...item,
        content: itemFile.prefix + itemFile.suffix,
      };
    }

    log.error(`[OpenTabContextProvider] failed to get content for item "${item.id}"`);
    return item;
  }
}

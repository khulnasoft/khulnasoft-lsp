import { Injectable } from '@khulnasoft/di';
import { AIContextItem, AIContextItemMetadata, AIContextSearchQuery } from '@khulnasoft/ai-context';
import { GID_NAMESPACE_MERGE_REQUEST, type KhulnaSoftGID, toKhulnaSoftGid } from '../../graphql/gid_utils';
import { log } from '../../log';
import { DuoProjectAccessChecker } from '../../services/duo_access';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../../services/duo_access/duo_feature_access_service';
import { DuoProjectStatus } from '../../services/duo_access/project_access_checker';
import {
  type MergeRequestDetails,
  type MergeRequestDiffDetails,
  MergeRequestService,
  type RestMergeRequestSearchResult,
} from '../../services/gitlab';
import { tryParseProjectPathFromWebUrl } from '../../services/gitlab/utils';
import { asyncDebounce, type AsyncDebouncedFunction } from '../../utils/async_debounce';
import { truncateToByteLimit } from '../../utils/byte_size';
import { AbstractAIContextProvider } from '../ai_context_provider';
import { AIContextProvider } from '..';
import { getAdvancedContextContentLimit } from './utils';
import { formatIssuableHeader, formatIssuableNotes } from './format_issueables';

export type MergeRequestMetadata = AIContextItemMetadata & {
  icon: 'merge-request';
  subTypeLabel: 'Merge request';
  webUrl: RestMergeRequestSearchResult['web_url'];
};

export interface MergeRequestAIContextItem extends AIContextItem {
  id: KhulnaSoftGID;
  category: 'merge_request';
  metadata: MergeRequestMetadata;
}

export interface MergeRequestContextProvider
  extends AbstractAIContextProvider<MergeRequestAIContextItem> {}

const MAX_SEARCH_RESULTS = 25;

@Injectable(AIContextProvider, [
  DuoProjectAccessChecker,
  MergeRequestService,
  DuoFeatureAccessService,
])
export class DefaultMergeRequestContextProvider
  extends AbstractAIContextProvider<MergeRequestAIContextItem>
  implements MergeRequestContextProvider
{
  #mergeRequestService: MergeRequestService;

  #duoProjectAccessChecker: DuoProjectAccessChecker;

  #debouncedSearchMergeRequests: AsyncDebouncedFunction<
    (query: AIContextSearchQuery) => Promise<MergeRequestAIContextItem[]>
  >;

  duoRequiredFeature = DuoFeature.IncludeMergeRequestContext;

  constructor(
    duoProjectAccessChecker: DuoProjectAccessChecker,
    mergeRequestService: MergeRequestService,
    duoFeatureAccessService: DuoFeatureAccessService,
  ) {
    super('merge_request', duoFeatureAccessService);

    this.#mergeRequestService = mergeRequestService;
    this.#duoProjectAccessChecker = duoProjectAccessChecker;
    this.#debouncedSearchMergeRequests = asyncDebounce(this.#searchMergeRequests.bind(this), 250);
  }

  async searchContextItems(query: AIContextSearchQuery): Promise<MergeRequestAIContextItem[]> {
    if (!query.query) {
      // If no search query has been provided yet, show the users assigned merge requests by default
      // The MR global search endpoint does not return relevant MRs with an empty query otherwise.
      return this.#getMergeRequestsForCurrentUser();
    }

    return this.#debouncedSearchMergeRequests(query);
  }

  async #getMergeRequestsForCurrentUser(): Promise<MergeRequestAIContextItem[]> {
    log.debug(
      `[MergeRequestContextProvider] no search query, getting default merge requests for current user`,
    );
    try {
      const mergeRequests =
        await this.#mergeRequestService.getCurrentUsersMergeRequests(MAX_SEARCH_RESULTS);
      return await this.#handleSearchResults(mergeRequests);
    } catch (error) {
      log.error(
        '[MergeRequestContextProvider] failed to get merge requests for current user',
        error,
      );
      return [];
    }
  }

  async #searchMergeRequests(query: AIContextSearchQuery): Promise<MergeRequestAIContextItem[]> {
    try {
      const mergeRequests = await this.#mergeRequestService.searchMergeRequests(
        query.query,
        MAX_SEARCH_RESULTS,
      );
      return await this.#handleSearchResults(mergeRequests);
    } catch (error) {
      log.error('[MergeRequestContextProvider] search failed.', error);
      return [];
    }
  }

  async #handleSearchResults(
    mergeRequestResults: RestMergeRequestSearchResult[],
  ): Promise<MergeRequestAIContextItem[]> {
    const currentSelections = await this.getSelectedContextItems();
    const currentSelectedIds = new Set(currentSelections.map((item) => item.id));
    const mergeRequests = mergeRequestResults.filter(
      (mr) => !currentSelectedIds.has(toKhulnaSoftGid(GID_NAMESPACE_MERGE_REQUEST, mr.id)),
    );

    const projectIds = mergeRequests.map((mr) => mr.project_id);

    const statuses = await this.#duoProjectAccessChecker.checkProjectStatusesByIds(projectIds);

    const resultsPromises = mergeRequests.map(async (mergeRequest) => {
      const status = statuses[mergeRequest.project_id];
      const enabled = status === DuoProjectStatus.DuoEnabled;

      const projectPath = tryParseProjectPathFromWebUrl(mergeRequest.web_url);

      return {
        id: toKhulnaSoftGid(GID_NAMESPACE_MERGE_REQUEST, mergeRequest.id),
        category: 'merge_request' as const,
        metadata: {
          enabled,
          disabledReasons: enabled ? [] : ['project disabled'],
          subType: 'merge_request',
          subTypeLabel: 'Merge request',
          icon: 'merge-request',
          title: mergeRequest.title,
          secondaryText: `${projectPath}!${mergeRequest.iid}`,
          webUrl: mergeRequest.web_url,
        },
      } satisfies MergeRequestAIContextItem;
    });

    const results = await Promise.all(resultsPromises);
    log.debug(
      `[MergeRequestContextProvider] found "${results.length}" results. Max allowed: "${MAX_SEARCH_RESULTS}"`,
    );

    return results.slice(0, MAX_SEARCH_RESULTS);
  }

  async retrieveSelectedContextItemsWithContent(): Promise<MergeRequestAIContextItem[]> {
    const selectedItems = await this.getSelectedContextItems();
    return Promise.all(selectedItems.map((item) => this.getItemWithContent(item)));
  }

  async getItemWithContent(item: MergeRequestAIContextItem): Promise<MergeRequestAIContextItem> {
    if (item.content) {
      return item;
    }

    const selectedItems = await this.getSelectedContextItems();

    try {
      const mergeRequest = await this.#mergeRequestService.getMergeRequestDetails(item.id);
      const formattedContent = this.#formatMergeRequestContent(
        item,
        mergeRequest,
        selectedItems.length || 1,
      );

      log.debug(`[MergeRequestContextProvider] formatted MR content:\n${formattedContent}`);

      return {
        ...item,
        content: formattedContent,
      };
    } catch (e) {
      log.error(
        `[MergeRequestContextProvider] Failed to retrieve content for merge request "${item.id}". Returning item without content.`,
        e,
      );
    }
    return item;
  }

  /**
   * Formats merge request GraphQL response to try and match the Rails implementation
   * See e.g.:
   * https://gitlab.com/gitlab-org/gitlab/blob/master/ee/app/serializers/ee/merge_request_ai_entity.rb
   * https://gitlab.com/gitlab-org/gitlab/blob/master/ee/lib/gitlab/llm/utils/merge_request_tool.rb
   */
  #formatMergeRequestContent(
    item: MergeRequestAIContextItem,
    mergeRequest: MergeRequestDetails,
    splitLimitBetweenMRs: number,
  ): string {
    // Split the content limit between diffs and notes, divided by how many MRs we have attached as context
    const contentLimit = getAdvancedContextContentLimit(splitLimitBetweenMRs);
    const diffByteLimit = Math.floor(contentLimit / 2);
    const notesByteLimit = Math.floor(contentLimit / 2);

    const header = formatIssuableHeader(mergeRequest, item.metadata.subTypeLabel);

    const formattedDiffs = this.#formatDiffs(
      mergeRequest.commits.nodes[0]?.diffs ?? [],
      diffByteLimit,
    );
    const formattedNotes = formatIssuableNotes(
      mergeRequest.discussions.nodes.flatMap((d) => d.notes.nodes),
      notesByteLimit,
    );

    return `${header}

Changes:
${formattedDiffs}

Comments:
${formattedNotes}`;
  }

  /**
   * Format MR diffs for prompt.
   * Strips git diff prefixes and truncates base don given limit
   */
  #formatDiffs(diffs: MergeRequestDiffDetails[], byteLimit: number): string {
    const formattedText = diffs.map((diff) => this.#formatDiff(diff)).join('');

    return truncateToByteLimit(formattedText, byteLimit);
  }

  #formatDiff(diff: MergeRequestDiffDetails): string {
    // Strip git diff prefix markers to save tokens
    const cleanDiff = diff.diff.replace(/^@@[\s\S]+?@@$/m, '').trimEnd();

    return `--- ${diff.oldPath}
+++ ${diff.newPath}
${cleanDiff}`;
  }
}

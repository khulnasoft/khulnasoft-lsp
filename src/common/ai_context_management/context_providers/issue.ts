import { Injectable } from '@khulnasoft/di';
import { AIContextItem, AIContextItemMetadata, AIContextSearchQuery } from '@khulnasoft/ai-context';
import { GID_NAMESPACE_ISSUE, type KhulnaSoftGID, toKhulnaSoftGid } from '../../graphql/gid_utils';
import { log } from '../../log';
import { DuoProjectAccessChecker } from '../../services/duo_access';
import { DuoProjectStatus } from '../../services/duo_access/project_access_checker';
import { IssueService, type IssueDetails, type RestIssueSearchResult } from '../../services/gitlab';
import { tryParseProjectPathFromWebUrl } from '../../services/gitlab/utils';
import { asyncDebounce, type AsyncDebouncedFunction } from '../../utils/async_debounce';
import { AbstractAIContextProvider } from '../ai_context_provider';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../../services/duo_access/duo_feature_access_service';
import { AIContextProvider } from '..';
import { getAdvancedContextContentLimit } from './utils';
import { formatIssuableHeader, formatIssuableNotes } from './format_issueables';

export type IssueMetadata = AIContextItemMetadata & {
  icon: 'issues';
  subTypeLabel: 'Issue';
  webUrl: RestIssueSearchResult['web_url'];
};

export interface IssueAIContextItem extends AIContextItem {
  id: KhulnaSoftGID;
  category: 'issue';
  metadata: IssueMetadata;
}

export interface IssueContextProvider extends AbstractAIContextProvider<IssueAIContextItem> {}

const MAX_SEARCH_RESULTS = 25;

@Injectable(AIContextProvider, [IssueService, DuoProjectAccessChecker, DuoFeatureAccessService])
export class DefaultIssueContextProvider
  extends AbstractAIContextProvider<IssueAIContextItem>
  implements IssueContextProvider
{
  readonly #issueService: IssueService;

  readonly #duoProjectAccessChecker: DuoProjectAccessChecker;

  readonly #debouncedSearchIssues: AsyncDebouncedFunction<
    (query: AIContextSearchQuery) => Promise<IssueAIContextItem[]>
  >;

  duoRequiredFeature = DuoFeature.IncludeIssueContext;

  constructor(
    issueService: IssueService,
    duoProjectAccessChecker: DuoProjectAccessChecker,
    duoFeatureAccessService: DuoFeatureAccessService,
  ) {
    super('issue', duoFeatureAccessService);

    this.#issueService = issueService;
    this.#duoProjectAccessChecker = duoProjectAccessChecker;
    this.#debouncedSearchIssues = asyncDebounce(this.#searchIssues.bind(this), 250);
  }

  async searchContextItems(query: AIContextSearchQuery): Promise<IssueAIContextItem[]> {
    if (!query.query) {
      // If no search query has been provided yet, show the users assigned issues by default
      // The issue search endpoint does not allow searching with empty query
      return this.#getIssuesForCurrentUser();
    }

    return this.#debouncedSearchIssues(query);
  }

  async #getIssuesForCurrentUser(): Promise<IssueAIContextItem[]> {
    log.debug(`[IssueContextProvider] no search query, getting default issues for current user`);
    try {
      const issues = await this.#issueService.getCurrentUsersIssues();
      return await this.#handleSearchResults(issues);
    } catch (error) {
      log.error('[IssueContextProvider] failed to get issues for current user', error);
      return [];
    }
  }

  async #searchIssues(query: AIContextSearchQuery): Promise<IssueAIContextItem[]> {
    try {
      const issues = await this.#issueService.searchIssues(query.query, MAX_SEARCH_RESULTS);
      return await this.#handleSearchResults(issues);
    } catch (error) {
      log.error('[IssueContextProvider] search failed.', error);
      return [];
    }
  }

  async #handleSearchResults(issues: RestIssueSearchResult[]): Promise<IssueAIContextItem[]> {
    const projectIds = issues.map((issue) => issue.project_id);

    const statuses = await this.#duoProjectAccessChecker.checkProjectStatusesByIds(projectIds);

    const resultsPromises = issues.map(async (issue) => {
      const status = statuses[issue.project_id];
      const enabled = status === DuoProjectStatus.DuoEnabled;

      const projectPath = tryParseProjectPathFromWebUrl(issue.web_url);

      return {
        id: toKhulnaSoftGid(GID_NAMESPACE_ISSUE, issue.id),
        category: 'issue',
        metadata: {
          enabled,
          disabledReasons: enabled ? [] : ['project disabled'],
          subType: 'issue',
          subTypeLabel: 'Issue',
          icon: 'issues',
          title: issue.title,
          secondaryText: `${projectPath}#${issue.iid}`,
          webUrl: issue.web_url,
        },
      } satisfies IssueAIContextItem;
    });

    const results = await Promise.all(resultsPromises);
    log.debug(
      `[IssueContextProvider] found ${results.length} results. Max allowed: ${MAX_SEARCH_RESULTS}`,
    );

    return results.slice(0, MAX_SEARCH_RESULTS);
  }

  async retrieveSelectedContextItemsWithContent(): Promise<IssueAIContextItem[]> {
    const selectedItems = await this.getSelectedContextItems();
    return Promise.all(selectedItems.map((item) => this.getItemWithContent(item)));
  }

  async getItemWithContent(item: IssueAIContextItem): Promise<IssueAIContextItem> {
    if (item.content) {
      return item;
    }

    const selectedItems = await this.getSelectedContextItems();

    try {
      const issue = await this.#issueService.getIssueDetails(item.id);
      const formattedContent = this.#formatIssueContent(item, issue, selectedItems.length || 1);

      log.debug(`[IssueContextProvider] formatted issue content:\n${formattedContent}`);

      return {
        ...item,
        content: formattedContent,
      };
    } catch (e) {
      log.error(
        `[IssueContextProvider] Failed to retrieve content for issue "${item.id}". Returning item without content.`,
        e,
      );
    }
    return item;
  }

  /**
   * Formats issue GraphQL response to try and match the Rails implementation
   * See e.g.:
   * https://gitlab.com/gitlab-org/gitlab/blob/master/ee/app/serializers/ee/issue_ai_entity.rb
   */
  #formatIssueContent(
    item: IssueAIContextItem,
    issue: IssueDetails,
    splitLimitBetweenIssues: number,
  ): string {
    const notesByteLimit = getAdvancedContextContentLimit(splitLimitBetweenIssues);

    const header = formatIssuableHeader(issue, item.metadata.subTypeLabel);

    const formattedNotes = formatIssuableNotes(
      issue.discussions.nodes.flatMap((d) => d.notes.nodes),
      notesByteLimit,
    );

    const milestone = issue.milestone?.title ? `Milestone: ${issue.milestone.title}\n` : '';
    const assignees = issue.assignees.nodes.length
      ? `Assignees: ${issue.assignees.nodes.map((a) => a.username).join(', ')}\n`
      : '';
    const labels = issue.labels.nodes.length
      ? `Labels: ${issue.labels.nodes.map((l) => l.title).join(', ')}\n`
      : '';
    const weight = issue.weight !== null ? `Weight: ${issue.weight}\n` : '';

    return `${header}
${issue.confidential ? 'Confidential: true\n' : ''}${milestone}${assignees}${labels}${weight}
Created: ${issue.createdAt}
Updated: ${issue.updatedAt}${issue.closedAt ? `\nClosed: ${issue.closedAt}` : ''}

Comments:
${formattedNotes}`;
  }
}

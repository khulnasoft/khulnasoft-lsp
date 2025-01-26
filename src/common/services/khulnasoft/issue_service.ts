import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { gql } from 'graphql-request';
import { KhulnaSoftApiService } from '@khulnasoft/core';
import type { KhulnaSoftGID } from '../../graphql/gid_utils';
import { log } from '../../log';
import type { IssuableDetails } from './index';

// Note this is an incomplete type definition, only properties actually in use are included.
// See: https://docs.khulnasoft.com/ee/api/search.html#scope-issues for full schema
export type RestIssueSearchResult = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  web_url: string;
};

export interface IssueDetails extends IssuableDetails {
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  confidential: boolean;
  userNotesCount: number;
  weight: number | null;
  milestone: {
    title: string;
  } | null;
  assignees: {
    nodes: Array<{
      username: string;
    }>;
  };
  labels: {
    nodes: Array<{
      title: string;
    }>;
  };
}

export interface IssueService {
  searchIssues(searchTerm: string, limit?: number): Promise<RestIssueSearchResult[]>;
  getCurrentUsersIssues(limit?: number): Promise<RestIssueSearchResult[]>;
  getIssueDetails(issueId: KhulnaSoftGID): Promise<IssueDetails>;
}

export const IssueService = createInterfaceId<IssueService>('IssueService');

@Injectable(IssueService, [KhulnaSoftApiService])
export class DefaultIssueService {
  #gitlabApiService: KhulnaSoftApiService;

  constructor(gitlabApi: KhulnaSoftApiService) {
    this.#gitlabApiService = gitlabApi;
  }

  async searchIssues(searchTerm: string, limit: number = 25): Promise<RestIssueSearchResult[]> {
    log.debug(`[IssueService] Searching issues with query: ${searchTerm}`);

    try {
      const issues = await this.#gitlabApiService.fetchFromApi<RestIssueSearchResult[]>({
        type: 'rest',
        method: 'GET',
        path: '/search',
        searchParams: {
          scope: 'issues',
          search: searchTerm,
          fields: 'title',
        },
      });

      log.debug(`[IssueService] search found ${issues.length} results. Max allowed: ${limit}`);

      return issues.slice(0, limit);
    } catch (error) {
      log.error(`[IssueService] Error searching issues with query "${searchTerm}"`, error);
      throw error;
    }
  }

  async getCurrentUsersIssues(limit: number = 25): Promise<RestIssueSearchResult[]> {
    log.debug('[IssueService] Fetching issues assigned to current user');

    try {
      const issues = await this.#gitlabApiService.fetchFromApi<RestIssueSearchResult[]>({
        type: 'rest',
        method: 'GET',
        path: '/issues',
        searchParams: {
          scope: 'assigned_to_me',
          state: 'opened',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: limit.toString(),
        },
      });

      log.debug(`[IssueService] Found ${issues.length} results. Max allowed: ${limit}`);

      return issues;
    } catch (error) {
      log.error('[IssueService] Error fetching issues for current user', error);
      throw error;
    }
  }

  async getIssueDetails(issueId: KhulnaSoftGID): Promise<IssueDetails> {
    log.debug(`[IssueService] Fetching issue details: ${issueId}`);

    try {
      const { issue } = await this.#gitlabApiService.fetchFromApi<{
        issue: IssueDetails;
      }>({
        type: 'graphql',
        query: gql`
          query getIssueDetails($id: IssueID!) {
            issue(id: $id) {
              title
              description
              state
              createdAt
              updatedAt
              closedAt
              confidential
              userNotesCount
              weight
              webUrl
              milestone {
                title
              }
              assignees(first: 10) {
                nodes {
                  username
                }
              }
              labels(first: 10) {
                nodes {
                  title
                }
              }
              discussions(first: 100) {
                nodes {
                  notes(first: 100) {
                    nodes {
                      body
                      author {
                        username
                      }
                      createdAt
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: issueId,
        },
      });

      log.debug(`[IssueService] Found issue details:\n${JSON.stringify(issue)}`);

      return issue;
    } catch (error) {
      log.error(`[IssueService] Error fetching issue details: ${issueId}`, error);
      throw error;
    }
  }
}

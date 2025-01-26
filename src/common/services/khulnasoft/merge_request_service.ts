import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { gql } from 'graphql-request';
import { KhulnaSoftApiService } from '@khulnasoft/core';
import type { KhulnaSoftGID } from '../../graphql/gid_utils';
import { log } from '../../log';
import type { IssuableDetails } from './index';

// Note this is an incomplete type definition, only properties actually in use are included.
// See: https://docs.khulnasoft.com/ee/api/search.html#scope-merge_requests for full schema
export type RestMergeRequestSearchResult = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  web_url: string;
};

export type MergeRequestDiffDetails = {
  oldPath: string;
  newPath: string;
  diff: string;
};

type MergeRequestCommit = {
  diffs: MergeRequestDiffDetails[];
};

export interface MergeRequestDetails extends IssuableDetails {
  commits: {
    nodes: MergeRequestCommit[];
  };
}

export interface MergeRequestService {
  searchMergeRequests(searchTerm: string, limit?: number): Promise<RestMergeRequestSearchResult[]>;
  getCurrentUsersMergeRequests(limit?: number): Promise<RestMergeRequestSearchResult[]>;
  getMergeRequestDetails(mergeRequestId: KhulnaSoftGID): Promise<MergeRequestDetails>;
}

export const MergeRequestService = createInterfaceId<MergeRequestService>('MergeRequestService');

@Injectable(MergeRequestService, [KhulnaSoftApiService])
export class DefaultMergeRequestService {
  #gitlabApiService: KhulnaSoftApiService;

  constructor(gitlabApi: KhulnaSoftApiService) {
    this.#gitlabApiService = gitlabApi;
  }

  async searchMergeRequests(
    searchTerm: string,
    limit: number = 25,
  ): Promise<RestMergeRequestSearchResult[]> {
    log.debug(`[MergeRequestService] Searching mergeRequests with query: ${searchTerm}`);

    try {
      const mergeRequests = await this.#gitlabApiService.fetchFromApi<
        RestMergeRequestSearchResult[]
      >({
        type: 'rest',
        method: 'GET',
        path: '/search',
        searchParams: {
          scope: 'merge_requests',
          search: searchTerm,
          fields: 'title',
        },
      });

      log.debug(
        `[MergeRequestService] search found ${mergeRequests.length} results. Max allowed: ${limit}`,
      );

      return mergeRequests.slice(0, limit);
    } catch (error) {
      log.error(
        `[MergeRequestService] Error searching mergeRequests with query "${searchTerm}"`,
        error,
      );
      throw error;
    }
  }

  async getCurrentUsersMergeRequests(limit: number = 25): Promise<RestMergeRequestSearchResult[]> {
    log.debug('[MergeRequestService] Fetching MRs assigned to current user');

    try {
      const mergeRequests = await this.#gitlabApiService.fetchFromApi<
        RestMergeRequestSearchResult[]
      >({
        type: 'rest',
        method: 'GET',
        path: '/merge_requests',
        searchParams: {
          scope: 'assigned_to_me',
          state: 'opened',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: limit.toString(),
        },
      });

      log.debug(
        `[MergeRequestService] Found ${mergeRequests.length} results. Max allowed: ${limit}`,
      );

      return mergeRequests;
    } catch (error) {
      log.error('[MergeRequestService] Error fetching MRs for current user', error);
      throw error;
    }
  }

  async getMergeRequestDetails(mergeRequestId: KhulnaSoftGID): Promise<MergeRequestDetails> {
    log.debug(`[MergeRequestService] Fetching MR details: ${mergeRequestId}`);

    try {
      const { mergeRequest } = await this.#gitlabApiService.fetchFromApi<{
        mergeRequest: MergeRequestDetails;
      }>({
        type: 'graphql',
        query: gql`
          query getMergeRequestDetails($id: MergeRequestID!) {
            mergeRequest(id: $id) {
              title
              description
              state
              webUrl
              commits(first: 1) {
                nodes {
                  diffs {
                    oldPath
                    newPath
                    diff
                  }
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
          id: mergeRequestId,
        },
      });

      log.debug(`[MergeRequestService] Found MR details:\n${JSON.stringify(mergeRequest)}`);

      return mergeRequest;
    } catch (error) {
      log.error(`[MergeRequestService] Error fetching MR details: ${mergeRequestId}`, error);
      throw error;
    }
  }
}

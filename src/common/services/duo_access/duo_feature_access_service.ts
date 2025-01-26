import { KhulnaSoftApiService } from '@khulnasoft/core';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { gql } from 'graphql-request';
import { AIContextPolicyResponse } from '@khulnasoft/ai-context';
import { log } from '../../log';

export enum DuoFeature {
  IncludeFileContext = 'include_file_context',
  IncludeSnippetContext = 'include_snippet_context',
  IncludeMergeRequestContext = 'include_merge_request_context',
  IncludeIssueContext = 'include_issue_context',
  IncludeDependencyContext = 'include_dependency_context',
  IncludeLocalGitContext = 'include_local_git_context',
}

export interface DuoFeatureAccessService {
  isFeatureEnabled(requiredFeature?: DuoFeature): Promise<AIContextPolicyResponse>;
}

export const DuoFeatureAccessService =
  createInterfaceId<DuoFeatureAccessService>('DuoFeatureAccessService');

@Injectable(DuoFeatureAccessService, [KhulnaSoftApiService])
export class DefaultDuoFeatureAccessService implements DuoFeatureAccessService {
  readonly #gitlabApiService: KhulnaSoftApiService;

  #featuresPromise: Promise<Set<DuoFeature>> | null = null;

  constructor(gitlabApiService: KhulnaSoftApiService) {
    this.#gitlabApiService = gitlabApiService;

    this.#gitlabApiService.onApiReconfigured(() => {
      // Next time a provider feature access is checked we will re-fetch using updated API details
      this.#featuresPromise = null;
    });
  }

  async #fetchFeatures(): Promise<Set<DuoFeature>> {
    if (!this.#gitlabApiService.instanceInfo) {
      // Handle a race condition where isContextProviderAllowed (and thus fetchFeatures) can be called before the API
      // has been configured for the first time. This happens consistently in integration tests. In this case, we will
      // wait for the first reconfiguration and then call back into fetchFeatures to continue checking the provider.
      return new Promise((resolve) => {
        const listener = this.#gitlabApiService.onApiReconfigured(() => {
          listener.dispose();
          resolve(this.#fetchFeatures());
        });
      });
    }

    try {
      type GqlAvailableFeaturesResponse = {
        currentUser: {
          duoChatAvailableFeatures: DuoFeature[];
        };
      };
      const response = await this.#gitlabApiService.fetchFromApi<GqlAvailableFeaturesResponse>({
        type: 'graphql',
        query: gql`
          query getDuoChatAvailableFeatures {
            currentUser {
              duoChatAvailableFeatures
            }
          }
        `,
        variables: {},
        supportedSinceInstanceVersion: {
          version: '17.6.0',
          resourceName: 'get Duo Chat available features',
        },
      });

      const { duoChatAvailableFeatures } = response.currentUser;
      log.debug(
        `[DuoChatFeatureAccessService] Fetched Duo Chat available features for current user: ${duoChatAvailableFeatures}`,
      );
      return new Set(duoChatAvailableFeatures);
    } catch (error) {
      log.error('[DuoFeatureAccessService] Error fetching Duo Chat available features:', error);

      // Empty set means no features will be available
      return new Set<DuoFeature>();
    }
  }

  async isFeatureEnabled(requiredFeature?: DuoFeature): Promise<AIContextPolicyResponse> {
    if (!requiredFeature) {
      return { enabled: true };
    }
    if (!this.#featuresPromise) {
      this.#featuresPromise = this.#fetchFeatures();
    }
    const features = await this.#featuresPromise;
    const enabled = features.has(requiredFeature);
    const disabledReasons = enabled ? undefined : [`Feature "${requiredFeature}" is not enabled`];

    return { enabled, disabledReasons };
  }
}

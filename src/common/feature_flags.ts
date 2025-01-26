import { gql, ClientError } from 'graphql-request';
import { Injectable, createInterfaceId } from '@khulnasoft/di';
import { DebouncedFunc, throttle } from 'lodash';
import { log } from './log';
import { KhulnaSoftApiClient } from './api';
import { ConfigService } from './config_service';

export enum ClientFeatureFlags {
  // Should match names found in https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/src/common/feature_flags/constants.ts
  StreamCodeGenerations = 'streamCodeGenerations',
  DuoWorkflow = 'duoWorkflow',
  RemoteSecurityScans = 'remoteSecurityScans',
}

export enum InstanceFeatureFlags {
  EditorAdvancedContext = 'advanced_context_resolver',
  CodeSuggestionsContext = 'code_suggestions_context',
  DuoAdditionalContext = 'duo_additional_context',
}

export const INSTANCE_FEATURE_FLAG_QUERY = gql`
  query featureFlagsEnabled($name: String!) {
    featureFlagEnabled(name: $name)
  }
`;
export const FeatureFlagService = createInterfaceId<FeatureFlagService>('FeatureFlagService');

export interface FeatureFlagService {
  /**
   * Checks if a feature flag is enabled on the KhulnaSoft instance.
   * @see `IKhulnaSoftAPI` for how the instance is determined.
   * @requires `updateInstanceFeatureFlags` to be called first.
   */
  isInstanceFlagEnabled(name: InstanceFeatureFlags): boolean;

  /**
   * Checks if a feature flag is enabled on the client.
   * @see `ConfigService` for client configuration.
   */
  isClientFlagEnabled(name: ClientFeatureFlags): boolean;

  /**
   * Re-fetches the instance feature flags from the network.
   * This function is throttled to prevent network thrashing if called rapidly.
   */
  updateInstanceFeatureFlags(): Promise<void>;
}

@Injectable(FeatureFlagService, [KhulnaSoftApiClient, ConfigService])
export class DefaultFeatureFlagService {
  #api: KhulnaSoftApiClient;

  #configService: ConfigService;

  #featureFlags: Map<string, boolean> = new Map();

  readonly #throttledUpdateInstanceFeatureFlags: DebouncedFunc<() => Promise<void>>;

  constructor(api: KhulnaSoftApiClient, configService: ConfigService) {
    this.#api = api;
    this.#featureFlags = new Map();
    this.#configService = configService;

    this.#throttledUpdateInstanceFeatureFlags = throttle(
      this.updateInstanceFeatureFlags.bind(this),
      5000,
    );
    this.#api.onApiReconfigured(async ({ isInValidState }) => {
      if (!isInValidState) return;

      await this.#updateInstanceFeatureFlags();
    });
  }

  /**
   * Fetches the feature flags from the gitlab instance
   * and updates the internal state.
   */
  async #fetchFeatureFlag(name: string): Promise<boolean> {
    try {
      const result = await this.#api.fetchFromApi<{ featureFlagEnabled: boolean }>({
        type: 'graphql',
        query: INSTANCE_FEATURE_FLAG_QUERY,
        variables: { name },
      });
      log.debug(`FeatureFlagService: feature flag ${name} is ${result.featureFlagEnabled}`);
      return result.featureFlagEnabled;
    } catch (e) {
      // FIXME: we need to properly handle graphql errors
      // https://github.com/khulnasoft/khulnasoft-lsp/-/issues/250
      if (e instanceof ClientError) {
        const fieldDoesntExistError = e.message.match(/field '([^']+)' doesn't exist on type/i);
        if (fieldDoesntExistError) {
          // we expect graphql-request to throw an error when the query doesn't exist (eg. KhulnaSoft 16.9)
          // so we debug to reduce noise
          log.debug(`FeatureFlagService: query doesn't exist`, e.message);
        } else {
          log.error(`FeatureFlagService: error fetching feature flag ${name}`, e);
        }
      }
      return false;
    }
  }

  /**
   * Fetches the feature flags from the gitlab instance
   * and updates the internal state.
   * This function is throttled to prevent network thrashing if called rapidly.
   */
  updateInstanceFeatureFlags(): Promise<void> {
    return this.#throttledUpdateInstanceFeatureFlags() ?? this.#updateInstanceFeatureFlags();
  }

  async #updateInstanceFeatureFlags(): Promise<void> {
    log.debug('FeatureFlagService: populating feature flags');
    for (const flag of Object.values(InstanceFeatureFlags)) {
      // eslint-disable-next-line no-await-in-loop
      this.#featureFlags.set(flag, await this.#fetchFeatureFlag(flag));
    }
  }

  /**
   * Checks if a feature flag is enabled on the KhulnaSoft instance.
   * @see `KhulnaSoftApiClient` for how the instance is determined.
   * @requires `updateInstanceFeatureFlags` to be called first.
   */
  isInstanceFlagEnabled(name: InstanceFeatureFlags): boolean {
    if (this.#configService.get('client.featureFlagOverrides')?.[name]) return true;
    return this.#featureFlags.get(name) ?? false;
  }

  /**
   * Checks if a feature flag is enabled on the client.
   * @see `ConfigService` for client configuration.
   */
  isClientFlagEnabled(name: ClientFeatureFlags): boolean {
    if (this.#configService.get('client.featureFlagOverrides')?.[name]) return true;
    const value = this.#configService.get('client.featureFlags')?.[name];
    return value ?? false;
  }
}

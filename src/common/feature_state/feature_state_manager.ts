import { Disposable } from '@khulnasoft/disposable';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Notifier, NotifyFn } from '../notifier';
import { FeatureStateNotificationParams } from '../notifications';
import { getEntries } from '../utils/get_entries';
import { log } from '../log';
import { StateCheck } from './state_check';
import { CodeSuggestionsSupportedLanguageCheck } from './supported_language_check';
import { ProjectDuoAccessCheck } from './project_duo_acces_check';
import { FeatureState, CHECKS_PER_FEATURE, StateCheckId } from './feature_state_management_types';
import { CodeSuggestionsDuoLicenseCheck } from './code_suggestions_duo_license_check';
import { CodeSuggestionsInstanceVersionCheck } from './minimal_gitlab_version_for_code_suggestions_check';
import { ChatEnabledCheck } from './chat_enabled_check';
import { CodeSuggestionsEnabledCheck } from './code_suggestions_enabled_check';
import { DuoChatLicenseCheck } from './duo_chat_license_check';
import { AuthenticationRequiredCheck } from './authentication_required_check';
import { SuggestionApiErrorCheck } from './suggestion_api_error_check';

const sortChecksInPriority = (
  orderedChecks: StateCheckId[],
  unorderedChecks: StateCheck<StateCheckId>[],
) => {
  return orderedChecks
    .map((checkId) => unorderedChecks.find((check) => check.id === checkId))
    .filter((check) => check !== undefined);
};

export interface FeatureStateManager extends Notifier<FeatureStateNotificationParams>, Disposable {}

export const FeatureStateManager = createInterfaceId<FeatureStateManager>('FeatureStateManager');

@Injectable(FeatureStateManager, [
  SuggestionApiErrorCheck,
  AuthenticationRequiredCheck,
  CodeSuggestionsInstanceVersionCheck,
  CodeSuggestionsDuoLicenseCheck,
  ProjectDuoAccessCheck,
  CodeSuggestionsSupportedLanguageCheck,
  ChatEnabledCheck,
  CodeSuggestionsEnabledCheck,
  DuoChatLicenseCheck,
])
export class DefaultFeatureStateManager implements FeatureStateManager {
  #checks: StateCheck<StateCheckId>[] = [];

  #subscriptions: Disposable[] = [];

  #notify?: NotifyFn<FeatureStateNotificationParams>;

  #precomputedSortedChecks: Map<string, StateCheck<StateCheckId>[]> = new Map();

  #engagedChecksSet: Set<StateCheckId> = new Set();

  constructor(
    suggestionApiErrorCheck: SuggestionApiErrorCheck,
    authenticationRequiredCheck: AuthenticationRequiredCheck,
    codeSuggestionsInstanceVersionCheck: CodeSuggestionsInstanceVersionCheck,
    codeSuggestionsDuoLicenseCheck: CodeSuggestionsDuoLicenseCheck,
    projectDuoAccessCheck: ProjectDuoAccessCheck,
    supportedLanguagePolicy: CodeSuggestionsSupportedLanguageCheck,
    chatEnabledCheck: ChatEnabledCheck,
    codeSuggestionsEnabledCheck: CodeSuggestionsEnabledCheck,
    duoChatLicenseCheck: DuoChatLicenseCheck,
  ) {
    this.#checks.push(
      authenticationRequiredCheck,
      codeSuggestionsInstanceVersionCheck,
      codeSuggestionsDuoLicenseCheck,
      projectDuoAccessCheck,
      supportedLanguagePolicy,
      chatEnabledCheck,
      codeSuggestionsEnabledCheck,
      duoChatLicenseCheck,
      suggestionApiErrorCheck,
    );

    // Precompute sorted checks for each feature
    getEntries(CHECKS_PER_FEATURE).forEach(([featureId, orderedFeatureStateChecks]) => {
      const sortedChecks = sortChecksInPriority(orderedFeatureStateChecks, this.#checks);
      this.#precomputedSortedChecks.set(featureId, sortedChecks);
    });
  }

  async init(notify: NotifyFn<FeatureStateNotificationParams>): Promise<void> {
    this.#notify = notify;

    this.#subscriptions.push(
      ...this.#checks.map((check) =>
        check.onChanged(async () => {
          if (check.engaged) {
            this.#engagedChecksSet.add(check.id);
          } else {
            this.#engagedChecksSet.delete(check.id);
          }
          await this.#notifyClient();
        }),
      ),
    );

    try {
      await Promise.all(this.#checks.filter((c) => Boolean(c.init)).map((c) => c.init?.()));
    } catch (e) {
      log.error('Failed to initialize some feature state checks', e);
    }
  }

  async #notifyClient() {
    if (!this.#notify) {
      throw new Error(
        "The state manager hasn't been initialized. It can't send notifications. Call the init method first.",
      );
    }
    await this.#notify(this.#state);
  }

  dispose() {
    this.#subscriptions.forEach((s) => s.dispose());
  }

  get #state(): FeatureState[] {
    return getEntries(CHECKS_PER_FEATURE).map(([featureId]) => {
      const sortedChecks = this.#precomputedSortedChecks.get(featureId) || [];

      const engagedFeatureChecks = sortedChecks
        .filter((check) => this.#engagedChecksSet.has(check.id))
        .map((check) => ({
          checkId: check.id,
          details: check.details,
          context: check.context,
          engaged: true,
        }));

      const allFeatureChecks = sortedChecks.map((check) => ({
        checkId: check.id,
        details: check.details,
        context: check.context,
        engaged: this.#engagedChecksSet.has(check.id),
      }));

      return {
        featureId,
        engagedChecks: engagedFeatureChecks,
        allChecks: allFeatureChecks,
      };
    });
  }
}

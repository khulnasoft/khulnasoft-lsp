import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ClientConfig } from '../config_service';
import {
  CODE_SUGGESTIONS,
  CodeSuggestionsDuoLicenseCheck,
  CodeSuggestionsInstanceVersionCheck,
  Feature,
  FeatureState,
  ProjectDuoAccessCheck,
} from '../feature_state';
import { StateConfigCheck } from '../feature_state/state_check';
import { CodeSuggestionsEnabledCheck } from '../feature_state/code_suggestions_enabled_check';
import { ConfigurationValidator } from './configuration_validator';

export type CodeSuggestionsConfigurationValidator = ConfigurationValidator;

export const CodeSuggestionsConfigurationValidator =
  createInterfaceId<CodeSuggestionsConfigurationValidator>('CodeSuggestionsConfigurationValidator');

@Injectable(CodeSuggestionsConfigurationValidator, [
  CodeSuggestionsInstanceVersionCheck,
  ProjectDuoAccessCheck,
  CodeSuggestionsDuoLicenseCheck,
  CodeSuggestionsEnabledCheck,
])
export class DefaultCodeSuggestionsConfigurationValidator
  implements CodeSuggestionsConfigurationValidator
{
  #orderedChecks: StateConfigCheck[] = [];

  constructor(
    codeSuggestionsInstanceVersionCheck: CodeSuggestionsInstanceVersionCheck,
    duoProjectAccessChecker: ProjectDuoAccessCheck,
    codeSuggestionsDuoLicenseCheck: CodeSuggestionsDuoLicenseCheck,
    codeSuggestionsEnabledCheck: CodeSuggestionsEnabledCheck,
  ) {
    this.#orderedChecks = [
      codeSuggestionsInstanceVersionCheck,
      duoProjectAccessChecker,
      codeSuggestionsDuoLicenseCheck,
      codeSuggestionsEnabledCheck,
    ];
  }

  feature: Feature = CODE_SUGGESTIONS;

  async validate(config: ClientConfig): Promise<FeatureState> {
    const results = await Promise.all(this.#orderedChecks.map((check) => check.validate(config)));

    const engagedChecks = results.filter((result) => result !== undefined);

    return { featureId: CODE_SUGGESTIONS, engagedChecks };
  }
}

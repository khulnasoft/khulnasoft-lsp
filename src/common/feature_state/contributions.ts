import { DefaultChatEnabledCheck } from './chat_enabled_check';
import { DefaultCodeSuggestionsEnabledCheck } from './code_suggestions_enabled_check';
import { DefaultDuoChatLicenseCheck } from './duo_chat_license_check';
import { DefaultSuggestionApiErrorCheck } from './suggestion_api_error_check';
import { DefaultSuggestionApiErrorNotifier } from './suggestion_api_error_notifier';
import { DefaultAuthenticationRequiredCheck } from './authentication_required_check';
import {
  DefaultFeatureStateManager,
  DefaultCodeSuggestionsSupportedLanguageCheck,
  DefaultProjectDuoAccessCheck,
  DefaultCodeSuggestionsDuoLicenseCheck,
  DefaultCodeSuggestionsInstanceVersionCheck,
} from '.';

export const featureStateContributions = [
  DefaultCodeSuggestionsSupportedLanguageCheck,
  DefaultProjectDuoAccessCheck,
  DefaultCodeSuggestionsDuoLicenseCheck,
  DefaultCodeSuggestionsInstanceVersionCheck,
  DefaultChatEnabledCheck,
  DefaultCodeSuggestionsEnabledCheck,
  DefaultDuoChatLicenseCheck,
  DefaultAuthenticationRequiredCheck,
  DefaultFeatureStateManager,
  DefaultSuggestionApiErrorCheck,
  DefaultSuggestionApiErrorNotifier,
] as const;

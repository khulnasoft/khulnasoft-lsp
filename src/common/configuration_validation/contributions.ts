import { DefaultAuthenticationConfigurationValidator } from './authentication_configuration_validator';
import { DefaultChatConfigurationValidator } from './chat_configuration_validator';
import { DefaultCodeSuggestionsConfigurationValidator } from './code_suggestions_configuration_validator';
import { DefaultConfigurationValidationService } from './configuration_validation_service';

export const configurationValidationContributions = [
  DefaultAuthenticationConfigurationValidator,
  DefaultChatConfigurationValidator,
  DefaultCodeSuggestionsConfigurationValidator,
  DefaultConfigurationValidationService,
] as const;

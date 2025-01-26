import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { FeatureState } from '../feature_state';
import { ClientConfig } from '../config_service';
import { ChatConfigurationValidator } from './chat_configuration_validator';
import { AuthenticationConfigurationValidator } from './authentication_configuration_validator';
import { CodeSuggestionsConfigurationValidator } from './code_suggestions_configuration_validator';

export const CONFIGURATION_VALIDATION_REQUEST = '$/gitlab/validateConfiguration';

export type ConfigurationValidationRequest = ClientConfig;
export type ConfigurationValidationResponse = FeatureState[];

export interface ConfigurationValidationService {
  validate(request: ConfigurationValidationRequest): Promise<ConfigurationValidationResponse>;
}

export const ConfigurationValidationService = createInterfaceId<ConfigurationValidationService>(
  'ConfigurationValidationService',
);

@Injectable(ConfigurationValidationService, [
  AuthenticationConfigurationValidator,
  ChatConfigurationValidator,
  CodeSuggestionsConfigurationValidator,
])
export class DefaultConfigurationValidationService implements ConfigurationValidationService {
  #authenticationChecks: AuthenticationConfigurationValidator;

  #chatConfigurationValidator: ChatConfigurationValidator;

  #codeSuggestionsConfigurationValidator: CodeSuggestionsConfigurationValidator;

  constructor(
    authenticationConfigValidator: AuthenticationConfigurationValidator,
    chatConfigurationValidator: ChatConfigurationValidator,
    codeSuggestionsConfigurationValidator: CodeSuggestionsConfigurationValidator,
  ) {
    this.#authenticationChecks = authenticationConfigValidator;
    this.#chatConfigurationValidator = chatConfigurationValidator;
    this.#codeSuggestionsConfigurationValidator = codeSuggestionsConfigurationValidator;
  }

  async validate(
    settings: ConfigurationValidationRequest,
  ): Promise<ConfigurationValidationResponse> {
    const authResult = await this.#authenticationChecks.validate(settings);
    if (authResult.engagedChecks.length) {
      return [authResult];
    }

    const duoResults = await Promise.all([
      this.#chatConfigurationValidator.validate(settings),
      this.#codeSuggestionsConfigurationValidator.validate(settings),
    ]);
    return [authResult, ...duoResults];
  }
}

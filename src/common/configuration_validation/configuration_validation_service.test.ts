import {
  AUTHENTICATION,
  CHAT,
  CHAT_NO_LICENSE,
  CODE_SUGGESTIONS,
  FeatureState,
} from '../feature_state';
import { AuthenticationConfigurationValidator } from './authentication_configuration_validator';
import { ChatConfigurationValidator } from './chat_configuration_validator';
import { CodeSuggestionsConfigurationValidator } from './code_suggestions_configuration_validator';
import {
  ConfigurationValidationRequest,
  ConfigurationValidationService,
  DefaultConfigurationValidationService,
} from './configuration_validation_service';

describe('ConfigurationValidationService', () => {
  const request: ConfigurationValidationRequest = { baseUrl: 'https://gitlab.com', token: 'token' };

  let authenticationConfigurationValidator: jest.Mocked<AuthenticationConfigurationValidator>;
  let chatConfigurationValidator: jest.Mocked<ChatConfigurationValidator>;
  let codeSuggestionsConfigurationValidator: jest.Mocked<CodeSuggestionsConfigurationValidator>;

  let configValidationService: ConfigurationValidationService;

  beforeEach(() => {
    authenticationConfigurationValidator = {
      feature: AUTHENTICATION,
      validate: jest.fn(),
    };

    chatConfigurationValidator = {
      feature: CHAT,
      validate: jest.fn(),
    };

    codeSuggestionsConfigurationValidator = {
      feature: CODE_SUGGESTIONS,
      validate: jest.fn(),
    };

    configValidationService = new DefaultConfigurationValidationService(
      authenticationConfigurationValidator,
      chatConfigurationValidator,
      codeSuggestionsConfigurationValidator,
    );
  });

  it('should not validate chat and code suggestions if the authentication validation fails', async () => {
    const authenticationCheckResult: FeatureState = {
      featureId: AUTHENTICATION,
      engagedChecks: [{ checkId: 'authentication-required', engaged: true }],
    };
    authenticationConfigurationValidator.validate.mockResolvedValue(authenticationCheckResult);

    const result = await configValidationService.validate(request);

    expect(result).toContainEqual(authenticationCheckResult);
    expect(result).toHaveLength(1);

    expect(authenticationConfigurationValidator.validate).toHaveBeenCalledWith(request);
    expect(chatConfigurationValidator.validate).not.toHaveBeenCalled();
    expect(codeSuggestionsConfigurationValidator.validate).not.toHaveBeenCalled();
  });

  it('should run chat and code suggestions state checks when authentication succeeds', async () => {
    const authenticationCheckResult: FeatureState = {
      featureId: AUTHENTICATION,
      engagedChecks: [],
    };
    const chatCheckResult: FeatureState = {
      featureId: CHAT,
      engagedChecks: [{ checkId: CHAT_NO_LICENSE, engaged: true }],
    };
    const codeSuggestionsCheckResult: FeatureState = {
      featureId: CODE_SUGGESTIONS,
      engagedChecks: [],
    };
    authenticationConfigurationValidator.validate.mockResolvedValue(authenticationCheckResult);
    chatConfigurationValidator.validate.mockResolvedValue(chatCheckResult);
    codeSuggestionsConfigurationValidator.validate.mockResolvedValue(codeSuggestionsCheckResult);

    const result = await configValidationService.validate(request);

    expect(result).toContainEqual(authenticationCheckResult);
    expect(result).toContainEqual(chatCheckResult);
    expect(result).toContainEqual(codeSuggestionsCheckResult);
    expect(result).toHaveLength(3);

    expect(authenticationConfigurationValidator.validate).toHaveBeenCalledWith(request);
    expect(chatConfigurationValidator.validate).toHaveBeenCalledWith(request);
    expect(codeSuggestionsConfigurationValidator.validate).toHaveBeenCalledWith(request);
  });
});

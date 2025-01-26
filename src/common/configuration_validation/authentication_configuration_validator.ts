import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ClientConfig } from '../config_service';
import {
  AUTHENTICATION,
  AUTHENTICATION_REQUIRED,
  FeatureState,
  FeatureStateCheck,
  INVALID_TOKEN,
  StateCheckId,
} from '../feature_state';
import { KhulnaSoftApiClient } from '../api';
import { ConfigurationValidator } from './configuration_validator';

export type AuthenticationConfigurationValidator = ConfigurationValidator;

export const AuthenticationConfigurationValidator =
  createInterfaceId<AuthenticationConfigurationValidator>('AuthenticationConfigurationValidator');

@Injectable(AuthenticationConfigurationValidator, [KhulnaSoftApiClient])
export class DefaultAuthenticationConfigurationValidator
  implements AuthenticationConfigurationValidator
{
  #api: KhulnaSoftApiClient;

  constructor(api: KhulnaSoftApiClient) {
    this.#api = api;
  }

  feature = AUTHENTICATION;

  async validate(config: ClientConfig): Promise<FeatureState> {
    const engagedCheck = await this.#getEngagedCheck(config);

    if (engagedCheck) {
      return {
        featureId: AUTHENTICATION,
        engagedChecks: [engagedCheck],
      };
    }

    return { featureId: AUTHENTICATION, engagedChecks: [] };
  }

  async #getEngagedCheck(
    config: ClientConfig,
  ): Promise<FeatureStateCheck<StateCheckId> | undefined> {
    const { baseUrl, token } = config;

    if (!token || !baseUrl) {
      return {
        checkId: AUTHENTICATION_REQUIRED,
        details: 'You need to authenticate to use KhulnaSoft Duo.',
        engaged: true,
      };
    }

    const result = await this.#api.checkToken(baseUrl, token);

    if (!result.valid) {
      return {
        checkId: INVALID_TOKEN,
        details: result.message,
        engaged: true,
      };
    }

    return undefined;
  }
}

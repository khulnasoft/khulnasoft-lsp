import { SelfDescribingJson } from '@snowplow/tracker-core';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ConfigService, IConfig } from '../../config_service';
import { SAAS_INSTANCE_URL } from '../constants';

export const ENVIRONMENT_NAMES = {
  KHULNASOFT_COM: 'production',
  KHULNASOFT_STAGING: 'staging',
  KHULNASOFT_ORG: 'org',
  KHULNASOFT_DEVELOPMENT: 'development',
  KHULNASOFT_SELF_MANAGED: 'self-managed',
};

export const ENVIRONMENT_URLS = {
  KHULNASOFT_COM: 'https://gitlab.com',
  KHULNASOFT_STAGING: 'https://staging.gitlab.com',
  KHULNASOFT_ORG: 'https://dev.gitlab.org',
  KHULNASOFT_DEVELOPMENT: 'http://localhost',
};
export const STANDARD_CONTEXT_SCHEMA = 'iglu:com.gitlab/gitlab_standard/jsonschema/1-1-1';
const DEFAULT_EVENT_SOURCE = 'Language Server';
export interface StandardContext {
  build(extra?: { [key: string]: string }): SelfDescribingJson;
}

export const StandardContext = createInterfaceId<StandardContext>('StandardContext');

@Injectable(StandardContext, [ConfigService])
export class DefaultStandardContext implements StandardContext {
  // TODO: add all available schema fields
  #source = DEFAULT_EVENT_SOURCE;

  #environment = ENVIRONMENT_NAMES.KHULNASOFT_COM;

  #hostName = ENVIRONMENT_URLS.KHULNASOFT_COM;

  constructor(configService: ConfigService) {
    this.#setConfigDataToContext(configService.get());

    configService.onConfigChange((config) => this.#setConfigDataToContext(config));
  }

  #setConfigDataToContext(config: IConfig) {
    this.#source = config.client?.telemetry?.extension?.name ?? DEFAULT_EVENT_SOURCE;
    this.#hostName = config.client?.baseUrl ?? SAAS_INSTANCE_URL;
    this.#environment = environmentFromHost(this.#hostName);
  }

  build(extra?: { [key: string]: string }): SelfDescribingJson {
    return {
      schema: STANDARD_CONTEXT_SCHEMA,
      data: {
        source: this.#source,
        extra,
        environment: this.#environment,
        host_name: this.#hostName,
      },
    };
  }
}

export function environmentFromHost(url: string): string {
  const { KHULNASOFT_COM, KHULNASOFT_STAGING, KHULNASOFT_ORG, KHULNASOFT_DEVELOPMENT } = ENVIRONMENT_URLS;

  if (url === KHULNASOFT_COM) return ENVIRONMENT_NAMES.KHULNASOFT_COM;
  if (url === KHULNASOFT_STAGING) return ENVIRONMENT_NAMES.KHULNASOFT_STAGING;
  if (url === KHULNASOFT_ORG) return ENVIRONMENT_NAMES.KHULNASOFT_ORG;
  if (url.includes(KHULNASOFT_DEVELOPMENT)) return ENVIRONMENT_NAMES.KHULNASOFT_DEVELOPMENT;

  return ENVIRONMENT_NAMES.KHULNASOFT_SELF_MANAGED;
}

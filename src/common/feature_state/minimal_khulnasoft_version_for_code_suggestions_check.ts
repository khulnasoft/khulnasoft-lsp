import { EventEmitter } from 'events';
import { Disposable } from '@khulnasoft/disposable';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ConfigService, ClientConfig } from '../config_service';
import { ApiRequest } from '../api_types';
import { KhulnaSoftApiClient } from '../api';
import { ifVersionGte } from '../utils/if_version_gte';
import {
  FeatureStateCheck,
  StateCheckId,
  UNSUPPORTED_KHULNASOFT_VERSION,
  UnsupportedKhulnaSoftVersionCheckContext,
} from './feature_state_management_types';
import { StateCheck, StateCheckChangedEventData, StateConfigCheck } from './state_check';

export const MINIMUM_CODE_SUGGESTIONS_VERSION = '16.8.0';

export type KhulnaSoftVersionResponse = {
  version: string;
  enterprise?: boolean;
};
export const versionRequest: ApiRequest<KhulnaSoftVersionResponse> = {
  type: 'rest',
  method: 'GET',
  path: '/version',
};

export type CodeSuggestionsInstanceVersionCheck = StateCheck<typeof UNSUPPORTED_KHULNASOFT_VERSION> &
  StateConfigCheck;

export const CodeSuggestionsInstanceVersionCheck =
  createInterfaceId<CodeSuggestionsInstanceVersionCheck>('CodeSuggestionsInstanceVersionCheck');

@Injectable(CodeSuggestionsInstanceVersionCheck, [KhulnaSoftApiClient, ConfigService])
export class DefaultCodeSuggestionsInstanceVersionCheck
  implements CodeSuggestionsInstanceVersionCheck
{
  #subscriptions: Disposable[] = [];

  #stateEmitter = new EventEmitter();

  #api: KhulnaSoftApiClient;

  #isVersionDeprecated = false;

  #token?: string;

  #baseUrl?: string;

  #instanceVersion?: string;

  details?: string;

  context?: UnsupportedKhulnaSoftVersionCheckContext;

  constructor(api: KhulnaSoftApiClient, configService: ConfigService) {
    this.#api = api;

    this.#subscriptions.push(
      configService.onConfigChange(async (config) => {
        const { token, baseUrl } = config.client;
        // FIXME: When configService has `affectsConfiguration` implemented - use that instead
        // https://github.com/khulnasoft/khulnasoft-lsp/-/issues/405
        // to avoid multiple API calls when neither token or baseUrl has changed
        if (baseUrl && token && (this.#baseUrl !== baseUrl || this.#token !== token)) {
          this.#baseUrl = baseUrl;
          this.#token = token;
          await this.#checkInstanceVersion();
        }
      }),
    );
  }

  async #checkInstanceVersion(): Promise<void> {
    const response = await this.#api.fetchFromApi(versionRequest);

    const { version } = response;

    if (!version) {
      return;
    }

    this.#instanceVersion = version;

    await ifVersionGte(
      version,
      MINIMUM_CODE_SUGGESTIONS_VERSION,
      () => {
        this.#isVersionDeprecated = false;
        this.#stateEmitter.emit('change', this);
      },
      () => {
        this.#isVersionDeprecated = true;
        this.details = `KhulnaSoft Duo Code Suggestions requires KhulnaSoft version 16.8 or later. KhulnaSoft instance located at: ${this.#baseUrl} is currently using ${this.#instanceVersion}`;
        this.context = {
          // we check that baseUrl is available before calling current method
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          baseUrl: this.#baseUrl!,
          version,
        };
        this.#stateEmitter.emit('change', this);
      },
    );
  }

  onChanged(listener: (data: StateCheckChangedEventData) => void): Disposable {
    this.#stateEmitter.on('change', listener);
    return {
      dispose: () => this.#stateEmitter.removeListener('change', listener),
    };
  }

  get engaged() {
    return this.#isVersionDeprecated;
  }

  id = UNSUPPORTED_KHULNASOFT_VERSION;

  dispose() {
    this.#subscriptions.forEach((s) => s.dispose());
  }

  async validate(config: ClientConfig): Promise<FeatureStateCheck<StateCheckId> | undefined> {
    const configVersionRequest: ApiRequest<KhulnaSoftVersionResponse> = {
      ...versionRequest,
      baseUrl: config.baseUrl,
      token: config.token,
    };

    const { version } = await this.#api.fetchFromApi(configVersionRequest);

    return ifVersionGte<FeatureStateCheck<StateCheckId> | undefined>(
      version,
      MINIMUM_CODE_SUGGESTIONS_VERSION,
      () => undefined,
      () => ({
        checkId: this.id,
        details: `KhulnaSoft Duo Code Suggestions requires KhulnaSoft version 16.8 or later. Current version is ${version}.`,
        engaged: true,
      }),
    );
  }
}

import EventEmitter from 'events';
import { GraphQLClient } from 'graphql-request';
import type { Variables, RequestDocument } from 'graphql-request';
import { compare as semverCompare } from 'semver';
import { CancellationToken, Disposable } from 'vscode-languageserver-protocol';
import { Cable as ActionCableCable } from '@anycable/core';
import { Injectable, createInterfaceId } from '@khulnasoft/di';
import { InstanceInfo, TokenInfo, ApiReconfiguredData } from '@khulnasoft/core';
import { ConfigService } from './config_service';
import {
  ICodeSuggestionModel,
  ClientInfo,
} from './tracking/code_suggestions/code_suggestions_tracking_types';
import { LsFetch } from './fetch';
import { log } from './log';
import { handleFetchError } from './handle_fetch_error';
import { getLanguageServerVersion } from './utils/get_language_server_version';
import { KHULNASOFT_API_BASE_URL } from './constants';
import { AdditionalContext, SuggestionOption, ApiRequest } from './api_types';
import { InvalidInstanceVersionError } from './fetch_error';
import { connectToCable } from './action_cable';
import { getUserAgent } from './utils/get_user_agent';
import { SimpleApiClient } from './simple_api_client';

/**
 * @deprecated This interface and implementation are being phased out in favor of the new KhulnaSoftApiService from the `@khulnasoft/core` package instead.
 *
 * Reasons for deprecation:
 * 1. Better separation of concerns as we move away from monolithic clients and services
 * 2. Support for declare dependencies on the core api service from packages and plugins
 * 3. Improved maintainability and testability as we move towards a more modular codebase
 *
 * Migration guide:
 * 1. Import KhulnaSoftApiService from '@khulnasoft/core'
 * 2. Use dependency injection to get an instance
 * 3. Use the new service methods for API interactions
 *
 * Example usage:
 * ```typescript
 * import { KhulnaSoftApiService } from '@khulnasoft/core';
 *
 * @Injectable(MyService, [KhulnaSoftApiService])
 * class MyService {
 *   #apiService: KhulnaSoftApiService;
 *
 *   constructor(apiService: KhulnaSoftApiService) {
 *     this.#apiService = apiService;
 *   }
 * }
 * ```
 */
export interface KhulnaSoftApiClient {
  checkToken(baseURL: string | undefined, token: string | undefined): Promise<TokenCheckResponse>;
  getCodeSuggestions(request: CodeSuggestionRequest): Promise<CodeSuggestionResponse | undefined>;
  getStreamingCodeSuggestions(
    request: CodeSuggestionRequest,
    cancellationToken: CancellationToken,
  ):
    | AsyncGenerator<
        {
          chunk: string;
          serverSentEvents: boolean;
        },
        void,
        void
      >
    | undefined;
  fetchFromApi<TReturnType>(request: ApiRequest<TReturnType>): Promise<TReturnType>;
  connectToCable(): Promise<ActionCableCable>;
  onApiReconfigured(listener: (data: ApiReconfiguredData) => void): Disposable;
  getSimpleClient(baseUrl: string, token: string): SimpleApiClient;
  readonly instanceInfo?: InstanceInfo;
  readonly tokenInfo?: TokenInfo;
}

export const KhulnaSoftApiClient = createInterfaceId<KhulnaSoftApiClient>('KhulnaSoftApiClient');

export type GenerationType = 'comment' | 'small_file' | 'empty_function' | undefined;

export interface CodeSuggestionRequest {
  prompt_version: number;
  project_path: string;
  model_provider?: string;
  project_id: number;
  current_file: CodeSuggestionRequestCurrentFile;
  intent?: 'completion' | 'generation';
  stream?: boolean;
  /** how many suggestion options should the API return */
  choices_count?: number;
  /** additional context to provide to the model */
  context?: AdditionalContext[];
  /* A user's instructions for code suggestions. */
  user_instruction?: string;
  /* The backend can add additional prompt info based on the type of event */
  generation_type?: GenerationType;
}

export interface CodeSuggestionRequestCurrentFile {
  file_name: string;
  content_above_cursor: string;
  content_below_cursor: string;
}

export interface CodeSuggestionResponse {
  choices?: SuggestionOption[];
  model?: ICodeSuggestionModel;
  status: number;
  error?: string;
  isDirectConnection?: boolean;
}

// FIXME: Rename to SuggestionOptionStream when renaming the SuggestionOption
export interface StartStreamOption {
  uniqueTrackingId: string;
  /** the streamId represents the beginning of a stream * */
  streamId: string;
}

export type SuggestionOptionOrStream = SuggestionOption | StartStreamOption;

export interface PersonalAccessToken {
  name: string;
  scopes: string[];
  active: boolean;
}

export interface OAuthTokenInfoResponse {
  scope: string[];
}

export type ValidTokenCheckResponse = {
  valid: true;
  tokenInfo: TokenInfo;
};

export type InvalidTokenCheckResponse = {
  valid: false;
  reason: 'unknown' | 'not_active' | 'invalid_scopes';
  message: string;
};

export type TokenCheckResponse = ValidTokenCheckResponse | InvalidTokenCheckResponse;

export interface IDirectConnectionDetailsHeaders {
  'X-Gitlab-Global-User-Id': string;
  'X-Gitlab-Instance-Id': string;
  'X-Gitlab-Host-Name': string;
  'X-Gitlab-Saas-Duo-Pro-Namespace-Ids': string;
}

export interface IDirectConnectionModelDetails {
  model_provider: string;
  model_name: string;
}

export interface IDirectConnectionDetails {
  base_url: string;
  token: string;
  expires_at: number;
  headers: IDirectConnectionDetailsHeaders;
  model_details: IDirectConnectionModelDetails;
}

const CONFIG_CHANGE_EVENT_NAME = 'apiReconfigured';

@Injectable(KhulnaSoftApiClient, [LsFetch, ConfigService])
export class KhulnaSoftAPI implements KhulnaSoftApiClient {
  #token: string | undefined;

  #baseURL: string;

  #clientInfo?: ClientInfo;

  #lsFetch: LsFetch;

  #eventEmitter = new EventEmitter();

  #configService: ConfigService;

  #instanceInfo?: InstanceInfo;

  #tokenInfo?: TokenInfo;

  getSimpleClient(baseUrl: string, token: string) {
    return new SimpleApiClient(this.#lsFetch, this.#clientInfo, baseUrl, token);
  }

  constructor(lsFetch: LsFetch, configService: ConfigService) {
    this.#baseURL = KHULNASOFT_API_BASE_URL;
    this.#lsFetch = lsFetch;
    this.#configService = configService;
    this.#configService.onConfigChange(async (config) => {
      this.#clientInfo = configService.get('client.clientInfo');
      this.#lsFetch.updateAgentOptions({
        ignoreCertificateErrors: this.#configService.get('client.ignoreCertificateErrors') ?? false,
        ...(this.#configService.get('client.httpAgentOptions') ?? {}),
      });
      await this.configureApi(config.client);
    });
  }

  onApiReconfigured(listener: (data: ApiReconfiguredData) => void): Disposable {
    this.#eventEmitter.on(CONFIG_CHANGE_EVENT_NAME, listener);
    return { dispose: () => this.#eventEmitter.removeListener(CONFIG_CHANGE_EVENT_NAME, listener) };
  }

  #fireApiReconfigured(data: ApiReconfiguredData) {
    this.#eventEmitter.emit(CONFIG_CHANGE_EVENT_NAME, data);
  }

  async configureApi({
    token,
    baseUrl = KHULNASOFT_API_BASE_URL,
  }: {
    token?: string;
    baseUrl?: string;
  }) {
    if (this.#token === token && this.#baseURL === baseUrl) return;

    this.#token = token;
    this.#baseURL = baseUrl;

    const tokenCheckResult = await this.checkToken(this.#baseURL, this.#token);
    let validationMessage;
    if (!tokenCheckResult.valid) {
      this.#configService.set('client.token', undefined);

      validationMessage = `Token is invalid. ${tokenCheckResult.message}. Reason: ${tokenCheckResult.reason}`;
      log.warn(validationMessage);
      this.#fireApiReconfigured({ isInValidState: false, validationMessage });
      return;
    }

    const instanceVersion = await this.#getKhulnaSoftInstanceVersion(this.#baseURL, this.#token);
    const instanceInfo = {
      instanceVersion,
      instanceUrl: this.#baseURL,
    };
    this.#instanceInfo = instanceInfo;

    this.#tokenInfo = tokenCheckResult.tokenInfo;

    this.#fireApiReconfigured({
      isInValidState: true,
      instanceInfo,
      tokenInfo: tokenCheckResult.tokenInfo,
    });
  }

  get instanceInfo() {
    return this.#instanceInfo;
  }

  get tokenInfo() {
    return this.#tokenInfo;
  }

  #looksLikePatToken(token: string): boolean {
    // OAuth tokens will be longer than 42 characters and PATs will be shorter.
    return token.length < 42;
  }

  async #checkPatToken(baseURL: string, token: string): Promise<TokenCheckResponse> {
    const headers = this.#getDefaultHeaders(token);

    const response = await this.#lsFetch.get(`${baseURL}/api/v4/personal_access_tokens/self`, {
      headers,
    });

    await handleFetchError(response, 'Information about personal access token');

    const { active, scopes } = (await response.json()) as PersonalAccessToken;

    if (!active) {
      return {
        valid: false,
        reason: 'not_active',
        message: 'Token is not active.',
      };
    }

    if (!this.#hasValidScopes(scopes)) {
      const joinedScopes = scopes.map((scope) => `'${scope}'`).join(', ');

      return {
        valid: false,
        reason: 'invalid_scopes',
        message: `Token has scope(s) ${joinedScopes} (needs 'api').`,
      };
    }

    return { valid: true, tokenInfo: { scopes, type: 'pat' } };
  }

  async #checkOAuthToken(baseURL: string, token: string): Promise<TokenCheckResponse> {
    const headers = this.#getDefaultHeaders(token);

    const response = await this.#lsFetch.get(`${baseURL}/oauth/token/info`, {
      headers,
    });
    await handleFetchError(response, 'Information about OAuth token');

    const { scope: scopes } = (await response.json()) as OAuthTokenInfoResponse;
    if (!this.#hasValidScopes(scopes)) {
      const joinedScopes = scopes.map((scope) => `'${scope}'`).join(', ');

      return {
        valid: false,
        reason: 'invalid_scopes',
        message: `Token has scope(s) ${joinedScopes} (needs 'api').`,
      };
    }

    return { valid: true, tokenInfo: { scopes, type: 'oauth' } };
  }

  async checkToken(
    baseURL: string = this.#baseURL,
    token: string = '',
  ): Promise<TokenCheckResponse> {
    try {
      if (this.#looksLikePatToken(token)) {
        log.info('Checking token for PAT validity');
        return await this.#checkPatToken(baseURL, token);
      }

      log.info('Checking token for OAuth validity');
      return await this.#checkOAuthToken(baseURL, token);
    } catch (err) {
      log.error('Error performing token check', err);
      return {
        valid: false,
        reason: 'unknown',
        message: `Failed to check token: ${err}`,
      };
    }
  }

  #hasValidScopes(scopes: string[]): boolean {
    return scopes.includes('api');
  }

  async getCodeSuggestions(
    request: CodeSuggestionRequest,
  ): Promise<CodeSuggestionResponse | undefined> {
    if (!this.#token) {
      throw new Error('Token needs to be provided to request Code Suggestions');
    }

    const headers = {
      ...this.#getDefaultHeaders(this.#token),
      'Content-Type': 'application/json',
    };

    const response = await this.#lsFetch.post(
      `${this.#baseURL}/api/v4/code_suggestions/completions`,
      { headers, body: JSON.stringify(request) },
    );

    await handleFetchError(response, 'Code Suggestions');

    const data = await response.json();
    return { ...data, status: response.status };
  }

  /**
   * Calls the code suggestions API with the given request,
   * and yields chunks of the stream as strings,
   * as the caller is responsible for aggregating them.
   *
   * We let the server know that this client supports SSE streaming by setting the `X-Supports-Sse-Streaming` header.
   *
   * We use the `X-Streaming-Format` header to determine if the server supports SSE streaming.
   * The caller is responsible for parsing the SSE events.
   */
  async *getStreamingCodeSuggestions(
    request: CodeSuggestionRequest,
    cancellationToken: CancellationToken,
  ):
    | AsyncGenerator<
        {
          chunk: string;
          serverSentEvents: boolean;
        },
        void,
        void
      >
    | undefined {
    if (!this.#token) {
      throw new Error('Token needs to be provided to stream code suggestions');
    }

    const headers = {
      ...this.#getDefaultHeaders(this.#token),
      'Content-Type': 'application/json',
      'X-Supports-Sse-Streaming': 'true',
    };

    const response = await this.#lsFetch.fetch(
      `${this.#baseURL}/api/v4/code_suggestions/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      },
    );
    await handleFetchError(response, 'Code Suggestions - Generation');

    const isSse = response.headers.get('X-Streaming-Format') === 'sse';
    for await (const chunk of this.#lsFetch.streamResponse(response, cancellationToken)) {
      yield { chunk, serverSentEvents: isSse };
    }
  }

  async fetchFromApi<TReturnType>(request: ApiRequest<TReturnType>): Promise<TReturnType> {
    const baseUrl = request.baseUrl ?? this.#baseURL;
    const token = request.token ?? this.#token;

    if (!token) {
      return Promise.reject(new Error('Token needs to be provided to authorise API request.'));
    }

    if (
      request.supportedSinceInstanceVersion &&
      !(await this.#instanceVersionHigherOrEqualThen(
        request.supportedSinceInstanceVersion.version,
        baseUrl,
        token,
      ))
    ) {
      return Promise.reject(
        new InvalidInstanceVersionError(
          `Can't ${request.supportedSinceInstanceVersion.resourceName} until your instance is upgraded to ${request.supportedSinceInstanceVersion.version} or higher.`,
        ),
      );
    }

    if (request.type === 'graphql') {
      return this.#graphqlRequest(baseUrl, token, request.query, request.variables, request.signal);
    }
    switch (request.method) {
      case 'GET':
        return this.getSimpleClient(baseUrl, token).fetchFromApi(request);
      case 'POST':
        return this.#postFetch(
          baseUrl,
          token,
          request.path,
          'resource',
          request.body,
          request.headers,
          request.signal,
        );
      case 'PATCH':
        return this.#patchFetch(
          baseUrl,
          token,
          request.path,
          'resource',
          request.body,
          request.headers,
          request.signal,
        );
      default:
        // the type assertion is necessary because TS doesn't expect any other types
        throw new Error(`Unknown request type ${(request as ApiRequest<unknown>).type}`);
    }
  }

  async connectToCable(): Promise<ActionCableCable> {
    const headers = this.#getDefaultHeaders(this.#token);
    const websocketOptions = {
      headers: {
        ...headers,
        Origin: this.#baseURL,
      },
    };

    return connectToCable(this.#baseURL, websocketOptions);
  }

  async #graphqlRequest<T = unknown, V extends Variables = Variables>(
    baseUrl: string,
    token: string,
    document: RequestDocument,
    variables?: V,
    signal?: AbortSignal,
  ): Promise<T> {
    const ensureEndsWithSlash = (url: string) => url.replace(/\/?$/, '/');
    const endpoint = new URL('./api/graphql', ensureEndsWithSlash(baseUrl)).href; // supports KhulnaSoft instances that are on a custom path, e.g. "https://example.com/gitlab"
    const graphqlFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = input instanceof URL ? input.toString() : input;
      return this.#lsFetch.post(url, {
        ...init,
        headers: { ...init?.headers },
        signal,
      });
    };

    const client = new GraphQLClient(endpoint, {
      fetch: graphqlFetch,
      headers: { ...this.#getDefaultHeaders(token) },
    });
    return client.request(document, variables);
  }

  async #postFetch<T>(
    baseUrl: string,
    token: string,
    apiResourcePath: string,
    resourceName = 'resource',
    body?: unknown,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${baseUrl}/api/v4${apiResourcePath}`;

    const response = await this.#lsFetch.post(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.#getDefaultHeaders(token),
        ...headers,
      },
      body: JSON.stringify(body),
      signal,
    });

    await handleFetchError(response, resourceName);

    return response.json() as Promise<T>;
  }

  async #patchFetch<T>(
    baseUrl: string,
    token: string,
    apiResourcePath: string,
    resourceName = 'resource',
    body?: unknown,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${baseUrl}/api/v4${apiResourcePath}`;

    const response = await this.#lsFetch.patch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.#getDefaultHeaders(token),
        ...headers,
      },
      body: JSON.stringify(body),
      signal,
    });

    await handleFetchError(response, resourceName);

    return response.json() as Promise<T>;
  }

  /** @deprecated Use SimpleApiClient.getDefaultHeaders() */
  #getDefaultHeaders(token?: string) {
    return {
      Authorization: `Bearer ${token}`,
      'User-Agent': getUserAgent(this.#clientInfo),
      'X-Gitlab-Language-Server-Version': getLanguageServerVersion(),
    };
  }

  async #instanceVersionHigherOrEqualThen(
    version: string,
    baseUrl: string,
    token: string,
  ): Promise<boolean> {
    let instanceVersion = this.#instanceInfo?.instanceVersion;

    if (!instanceVersion || baseUrl !== this.#baseURL) {
      instanceVersion = await this.#getKhulnaSoftInstanceVersion(baseUrl, token);
    }

    if (!instanceVersion) return false;
    return semverCompare(instanceVersion, version) >= 0;
  }

  async #getKhulnaSoftInstanceVersion(baseUrl: string, token?: string): Promise<string> {
    if (!token) {
      return '';
    }

    const response = await this.#lsFetch.get(`${baseUrl}/api/v4/version`, {
      headers: {
        ...this.#getDefaultHeaders(token),
      },
    });
    const { version } = await response.json();

    return version;
  }
}

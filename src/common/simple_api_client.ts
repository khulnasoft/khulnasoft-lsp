import { ApiRequest } from '@khulnasoft/core';
import { createQueryString, QueryValue } from './utils/create_query_string';
import { LsFetch } from './fetch';
import { ClientInfo } from './tracking/code_suggestions/code_suggestions_tracking_types';
import { getLanguageServerVersion } from './utils/get_language_server_version';
import { getUserAgent } from './utils/get_user_agent';
import { handleFetchError } from './handle_fetch_error';

export class SimpleApiClient {
  #lsFetch: LsFetch;

  #baseUrl: string;

  #token: string;

  #clientInfo?: ClientInfo;

  constructor(
    lsFetch: LsFetch,
    clientInfo: ClientInfo | undefined,
    baseUrl: string,
    token: string,
  ) {
    this.#lsFetch = lsFetch;
    this.#baseUrl = baseUrl;
    this.#token = token;
    this.#clientInfo = clientInfo;
  }

  getDefaultHeaders() {
    return {
      Authorization: `Bearer ${this.#token}`,
      'User-Agent': getUserAgent(this.#clientInfo),
      'X-Gitlab-Language-Server-Version': getLanguageServerVersion(),
    };
  }

  async fetchFromApi<TReturnType>(request: ApiRequest<TReturnType>): Promise<TReturnType> {
    if (request.type === 'graphql') {
      throw new Error('GraphQL is not supported in simple client yet.');
    }
    switch (request.method) {
      case 'GET':
        return this.#fetch(request.path, request.searchParams, request.headers, request.signal);
      default:
        // the type assertion is necessary because TS doesn't expect any other types
        throw new Error(`Unknown request type ${(request as ApiRequest<unknown>).type}`);
    }
  }

  async #fetch<T>(
    apiResourcePath: string,
    query: Record<string, QueryValue> = {},
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${this.#baseUrl}/api/v4${apiResourcePath}${createQueryString(query)}`;

    const result = await this.#lsFetch.get(url, {
      headers: { ...this.getDefaultHeaders(), ...headers },
      signal,
    });

    const resource = apiResourcePath.split('/').pop() || 'unknown resource';
    await handleFetchError(result, resource);

    return result.json() as Promise<T>;
  }
}

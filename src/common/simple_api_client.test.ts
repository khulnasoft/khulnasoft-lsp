import { ApiRequest, GetRequest, GraphQLRequest } from '@khulnasoft/core';
import { createFakeResponse } from './test_utils/create_fake_response';
import { SimpleApiClient } from './simple_api_client';
import { LsFetch } from './fetch';
import { ClientInfo } from './tracking/code_suggestions/code_suggestions_tracking_types';
import { createFakePartial } from './test_utils/create_fake_partial';
import { handleFetchError } from './handle_fetch_error';
import { getLanguageServerVersion } from './utils/get_language_server_version';

jest.mock('./handle_fetch_error');

describe('SimpleApiClient', () => {
  const lsFetch: LsFetch = createFakePartial<LsFetch>({
    get: jest.fn(),
  });

  const clientInfo: ClientInfo = {
    name: 'TestClient',
    version: '1.0.0',
  };

  const baseUrl = 'https://gitlab.com';
  const token = 'test-token';
  let client: SimpleApiClient;

  const testRequest: GetRequest<unknown> = {
    type: 'rest',
    method: 'GET',
    path: '/test',
  };

  beforeEach(() => {
    client = new SimpleApiClient(lsFetch, clientInfo, baseUrl, token);
  });

  describe('getDefaultHeaders', () => {
    it('returns correct default headers', () => {
      const headers = client.getDefaultHeaders();

      expect(headers).toEqual({
        Authorization: `Bearer ${token}`,
        'User-Agent': `gitlab-language-server:${getLanguageServerVersion()} (${clientInfo.name}:${clientInfo.version})`,
        'X-Gitlab-Language-Server-Version': getLanguageServerVersion(),
      });
    });
  });

  describe('fetchFromApi', () => {
    const mockResponse = { data: 'test' };

    beforeEach(() => {
      jest.resetAllMocks();
      jest.mocked(lsFetch.get).mockResolvedValue(createFakeResponse({ json: mockResponse }));
    });

    it('makes a GET request with correct URL and headers', async () => {
      const request: ApiRequest<unknown> = {
        ...testRequest,
        searchParams: { param1: 'value1', param2: 'value2' },
      };

      await client.fetchFromApi(request);

      expect(lsFetch.get).toHaveBeenCalledWith(
        'https://api.github.com/v4/test?param1=value1&param2=value2',
        expect.objectContaining({
          headers: client.getDefaultHeaders(),
        }),
      );
    });

    it('merges custom headers with default headers', async () => {
      const customHeaders = { 'Custom-Header': 'value' };
      const request: ApiRequest<unknown> = {
        ...testRequest,
        headers: customHeaders,
      };

      await client.fetchFromApi(request);

      expect(lsFetch.get).toHaveBeenCalledWith(
        'https://api.github.com/v4/test',
        expect.objectContaining({
          headers: {
            ...client.getDefaultHeaders(),
            ...customHeaders,
          },
        }),
      );
    });

    it('uses handleFetchError with the correct resource name', async () => {
      const errorResponse = createFakeResponse({ status: 404 });
      jest.mocked(lsFetch.get).mockResolvedValue(errorResponse);
      jest.mocked(handleFetchError).mockRejectedValue(new Error('test error'));

      await expect(client.fetchFromApi(testRequest)).rejects.toThrow();
      expect(handleFetchError).toHaveBeenCalledWith(errorResponse, 'test');
    });

    it('passes abort signal to fetch request', async () => {
      const abortSignal = new AbortController().signal;
      const request: ApiRequest<unknown> = {
        ...testRequest,
        signal: abortSignal,
      };

      await client.fetchFromApi(request);

      expect(lsFetch.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: abortSignal,
        }),
      );
    });

    it('throws error for unsupported request types', async () => {
      const request = createFakePartial<GraphQLRequest<unknown>>({
        type: 'graphql',
        query: 'query {}',
      });

      await expect(client.fetchFromApi(request)).rejects.toThrow(
        'GraphQL is not supported in simple client yet.',
      );
    });
  });
});

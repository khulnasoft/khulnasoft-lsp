import fetch from 'cross-fetch';
import { GraphQLClient, gql } from 'graphql-request';
import { ApiReconfiguredData } from '@khulnasoft/core';
import {
  KhulnaSoftAPI,
  CodeSuggestionResponse,
  InvalidTokenCheckResponse,
  ValidTokenCheckResponse,
} from './api';
import { INSTANCE_FEATURE_FLAG_QUERY } from './feature_flags';
import { CODE_SUGGESTIONS_RESPONSE, FILE_INFO } from './test_utils/mocks';
import { FetchBase, LsFetch } from './fetch';
import { createFakeResponse } from './test_utils/create_fake_response';
import { ConfigService, DefaultConfigService } from './config_service';
import { createFakePartial } from './test_utils/create_fake_partial';
import { ApiRequest } from './api_types';

jest.mock('cross-fetch');
jest.mock('graphql-request');

const KHULNASOFT_LANGUAGE_SERVER_VERSION = 'v0.0.0';
jest.mock('./utils/get_language_server_version', () => ({
  getLanguageServerVersion: jest.fn().mockImplementation(() => KHULNASOFT_LANGUAGE_SERVER_VERSION),
}));

const TEST_CODE_SUGGESTION_REQUEST = {
  prompt_version: 1,
  project_path: '',
  project_id: -1,
  current_file: {
    content_above_cursor: FILE_INFO.prefix,
    content_below_cursor: FILE_INFO.suffix,
    file_name: FILE_INFO.fileRelativePath,
  },
};

jest.useFakeTimers();

describe('KhulnaSoftAPI', () => {
  const lsFetch: LsFetch = new FetchBase();
  const token = 'glpat-1234';
  const gitlabBaseUrl = 'https://gitlab.com';
  const clientInfo = { name: 'MyClient', version: '1.0.0' };
  let configService: ConfigService;
  let api: KhulnaSoftAPI;
  let checkTokenSpy: jest.Spied<typeof KhulnaSoftAPI.prototype.checkToken>;

  const mockCancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: jest.fn(),
  };

  // adds configuration to the ApiClient
  const configureApi = (baseUrl = gitlabBaseUrl, localToken = token) => {
    configService.merge({
      client: {
        clientInfo,
        baseUrl,
        token: localToken,
      },
    });
    jest.runAllTicks();
  };

  const mockInstanceVersion = (version = '17.0.0') => {
    const originalGet = lsFetch.get.bind(lsFetch);

    lsFetch.get = jest.fn((url, options) => {
      if (typeof url === 'string' && url.includes('api/v4/version')) {
        const response = createFakeResponse({
          json: { version },
        });

        return Promise.resolve(response);
      }

      return originalGet(url, options);
    });
  };

  // adds configuration and also mocks the token check
  const prepareApi = ({
    baseUrl = gitlabBaseUrl,
    localToken = token,
    instanceVersion = 'v17.0.0',
  } = {}) => {
    checkTokenSpy.mockImplementation(async () =>
      createFakePartial<ValidTokenCheckResponse>({ valid: true }),
    );
    mockInstanceVersion(instanceVersion);
    configureApi(baseUrl, localToken);
  };

  beforeEach(async () => {
    configService = new DefaultConfigService();
    api = new KhulnaSoftAPI(lsFetch, configService);
    checkTokenSpy = jest.spyOn(api, 'checkToken');
  });

  describe('getCodeSuggestions', () => {
    describe('Error path', () => {
      it('should throw an error when no token provided', async () => {
        await expect(api.getCodeSuggestions(TEST_CODE_SUGGESTION_REQUEST)).rejects.toThrow(
          /Token needs to be provided to request Code Suggestions/,
        );
      });
    });

    describe('Success path', () => {
      let response: CodeSuggestionResponse | undefined;

      beforeEach(async () => {
        prepareApi();
        (fetch as jest.Mock).mockResolvedValueOnce(
          createFakeResponse({ status: 200, json: CODE_SUGGESTIONS_RESPONSE }),
        );

        response = await api.getCodeSuggestions(TEST_CODE_SUGGESTION_REQUEST);
      });

      it('should make a request for the code suggestions', () => {
        const [url, params] = (fetch as jest.Mock).mock.calls[0];

        expect(url).toBe(`${gitlabBaseUrl}/api/v4/code_suggestions/completions`);

        expect(params.headers).toMatchObject({
          Authorization: `Bearer ${token}`,
          'User-Agent': `gitlab-language-server:${KHULNASOFT_LANGUAGE_SERVER_VERSION} (${clientInfo.name}:${clientInfo?.version})`,
          'X-Gitlab-Language-Server-Version': KHULNASOFT_LANGUAGE_SERVER_VERSION,
          'Content-Type': 'application/json',
        });
      });

      it('should return code suggestions', async () => {
        expect(response).toEqual({ ...CODE_SUGGESTIONS_RESPONSE, status: 200 });
      });
    });
  });

  describe('checkToken', () => {
    const gitlabPAT = 'glpat-abcdefghijklmno12345';
    const gitlabPATWithNonDefaultPrefix = 'test-abcdefghijklmno12345';
    const oauthToken = 'abcdefghijklmno12345abcdefghijklmno12345abcdefghijklmno12345';

    beforeEach(() => {
      mockInstanceVersion();
      configureApi();
    });

    it('should request token validation to input url', async () => {
      const url = 'https://my-custom-gitlab.com';

      await api.checkToken(url, gitlabPAT);
      expect(fetch).toHaveBeenCalledWith(`${url}/api/v4/personal_access_tokens/self`, {
        headers: {
          Authorization: `Bearer ${gitlabPAT}`,
          'User-Agent': `gitlab-language-server:${KHULNASOFT_LANGUAGE_SERVER_VERSION} (${clientInfo.name}:${clientInfo?.version})`,
          'X-Gitlab-Language-Server-Version': KHULNASOFT_LANGUAGE_SERVER_VERSION,
        },
        method: 'GET',
      });
    });

    describe.each`
      tokenType       | PAT
      ${'gitlab'}     | ${gitlabPAT}
      ${'non-gitlab'} | ${gitlabPATWithNonDefaultPrefix}
    `('$tokenType PAT Token', ({ PAT }) => {
      it('should make a request to check the token', async () => {
        await api.checkToken(gitlabBaseUrl, PAT);

        expect(fetch).toHaveBeenCalledWith(`${gitlabBaseUrl}/api/v4/personal_access_tokens/self`, {
          headers: {
            Authorization: `Bearer ${PAT}`,
            'User-Agent': `gitlab-language-server:${KHULNASOFT_LANGUAGE_SERVER_VERSION} (${clientInfo.name}:${clientInfo?.version})`,
            'X-Gitlab-Language-Server-Version': KHULNASOFT_LANGUAGE_SERVER_VERSION,
          },
          method: 'GET',
        });
      });

      it('should return correct message and reason when token is not active', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => ({ active: false, scopes: ['read_user'] }),
        });

        const { reason, message } = (await api.checkToken(
          gitlabBaseUrl,
          PAT,
        )) as InvalidTokenCheckResponse;

        expect(reason).toBe('not_active');
        expect(message).toBe('Token is not active.');
      });

      it('should return correct message and reason when token does not have enough scopes', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => ({ active: true, scopes: ['read_api'] }),
        });

        const { reason, message } = (await api.checkToken(
          gitlabBaseUrl,
          PAT,
        )) as InvalidTokenCheckResponse;

        expect(reason).toBe('invalid_scopes');
        expect(message).toBe(`Token has scope(s) 'read_api' (needs 'api').`);
      });

      it('should return correct message and reason when token check failed', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce('Request failed.');

        const { reason, message } = (await api.checkToken(
          gitlabBaseUrl,
          PAT,
        )) as InvalidTokenCheckResponse;

        expect(reason).toBe('unknown');
        expect(message).toBe('Failed to check token: Request failed.');
      });

      it('should return that token is valid when it is active and has correct scopes', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => ({ active: true, scopes: ['api', 'read_user', 'read_api'] }),
        });

        const { valid } = (await api.checkToken(gitlabBaseUrl, PAT)) as ValidTokenCheckResponse;

        expect(valid).toBe(true);
      });
    });

    describe('OAuth Token', () => {
      it('should make a request to check the token', async () => {
        await api.checkToken(gitlabBaseUrl, oauthToken);

        expect(fetch).toHaveBeenCalledWith(`${gitlabBaseUrl}/oauth/token/info`, {
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            'User-Agent': `gitlab-language-server:${KHULNASOFT_LANGUAGE_SERVER_VERSION} (${clientInfo.name}:${clientInfo?.version})`,
            'X-Gitlab-Language-Server-Version': KHULNASOFT_LANGUAGE_SERVER_VERSION,
          },
          method: 'GET',
        });
      });

      it('should return correct message and reason when token does not have enough scopes', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => ({ scope: ['read_user'] }),
        });

        const { reason, message } = (await api.checkToken(
          gitlabBaseUrl,
          oauthToken,
        )) as InvalidTokenCheckResponse;

        expect(reason).toBe('invalid_scopes');
        expect(message).toBe(`Token has scope(s) 'read_user' (needs 'api').`);
      });

      it('should return correct message and reason when token check failed', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce('Request failed.');

        const { reason, message } = (await api.checkToken(
          gitlabBaseUrl,
          oauthToken,
        )) as InvalidTokenCheckResponse;

        expect(reason).toBe('unknown');
        expect(message).toBe('Failed to check token: Request failed.');
      });

      it('should return that token is valid when it has correct scopes', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => ({ scope: ['api', 'read_user', 'read_api'] }),
        });

        const { valid } = (await api.checkToken(
          gitlabBaseUrl,
          oauthToken,
        )) as ValidTokenCheckResponse;

        expect(valid).toBe(true);
      });
    });
  });

  describe('getStreamingCodeSuggestions', () => {
    const originalFetch = global.fetch;
    let streamingAPI: KhulnaSoftAPI;
    let streamingLsFetch: LsFetch;

    beforeEach(() => {
      global.fetch = jest.fn();
      streamingLsFetch = new FetchBase();
      streamingAPI = new KhulnaSoftAPI(streamingLsFetch, configService);
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('throws an error when token is not provided', async () => {
      const generator = streamingAPI.getStreamingCodeSuggestions(
        TEST_CODE_SUGGESTION_REQUEST,
        mockCancellationToken,
      );

      await expect(() => generator?.next()).rejects.toThrow(
        'Token needs to be provided to stream code suggestions',
      );
    });

    it('returns a generator', async () => {
      jest
        .spyOn(streamingLsFetch, 'fetch')
        .mockResolvedValue(createFakeResponse({ status: 200, text: 'hello' }));

      prepareApi();
      const generator = streamingAPI.getStreamingCodeSuggestions(
        TEST_CODE_SUGGESTION_REQUEST,
        mockCancellationToken,
      );
      await expect(() => generator?.next()).rejects.toThrow('Not implemented');
    });
    it('passes the streaming header to the server', async () => {
      const spy = jest
        .spyOn(streamingLsFetch, 'fetch')
        .mockResolvedValue(createFakeResponse({ status: 200, text: 'hello' }));

      prepareApi();
      const generator = streamingAPI.getStreamingCodeSuggestions(
        TEST_CODE_SUGGESTION_REQUEST,
        mockCancellationToken,
      );
      await expect(() => generator?.next()).rejects.toThrow('Not implemented');
      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Supports-Sse-Streaming': 'true',
          }),
        }),
      );
    });
  });

  describe('fetchFromApi', () => {
    const headers = {
      Authorization: `Bearer ${token}`,
      'User-Agent': `gitlab-language-server:${KHULNASOFT_LANGUAGE_SERVER_VERSION} (${clientInfo.name}:${clientInfo?.version})`,
      'X-Gitlab-Language-Server-Version': KHULNASOFT_LANGUAGE_SERVER_VERSION,
    };

    const setupKhulnaSoftApi = async (
      baseUrl: string,
      localToken: string | undefined,
    ): Promise<KhulnaSoftAPI> => {
      prepareApi({ baseUrl, localToken });
      return api;
    };
    const apiPath = '/test';

    const mockRestRequest = createFakePartial<ApiRequest<unknown>>({
      method: 'GET',
      path: apiPath,
    });

    describe('when no token provided', () => {
      it('should not make a request', async () => {
        await expect(api.fetchFromApi(mockRestRequest)).rejects.toThrow(
          'Token needs to be provided to authorise API request.',
        );
        expect(fetch).not.toHaveBeenCalled();
      });
    });

    describe('when instance version is not supported', () => {
      beforeEach(() => {
        prepareApi({ instanceVersion: '17.0.0-pre' });
      });

      it('should not make a request', async () => {
        const requestWithApiEndpointVersionSupport = createFakePartial<ApiRequest<Promise<string>>>(
          {
            ...mockRestRequest,
            supportedSinceInstanceVersion: {
              version: '17.2.0',
              resourceName: 'do something',
            },
          },
        );
        await expect(api.fetchFromApi(requestWithApiEndpointVersionSupport)).rejects.toThrow(
          `Can't do something until your instance is upgraded to 17.2.0 or higher.`,
        );
        expect(fetch).not.toHaveBeenCalled();
      });
    });

    describe('when specified url is the default url', () => {
      it('should request instance version if it has not already been validated', async () => {
        mockInstanceVersion('17.2.0');

        jest.mocked(fetch).mockResolvedValue(
          createFakeResponse({
            json: {},
          }),
        );

        const request = createFakePartial<ApiRequest<Promise<string>>>({
          baseUrl: 'https://gitlab.com',
          token: 'abc',
          type: 'rest',
          method: 'GET',
          path: '/test',
          supportedSinceInstanceVersion: {
            version: '17.2.0',
            resourceName: 'do something',
          },
        });

        await api.fetchFromApi(request);

        expect(lsFetch.get).toHaveBeenCalledWith(`https://api.github.com/v4/version`, {
          headers: expect.objectContaining({
            Authorization: `Bearer abc`,
          }),
        });
      });
    });

    describe('when token and base url are specified', () => {
      const specifiedBaseUrl = 'https://my-gitlab.com';
      const specifiedToken = 'abc';

      const requestWithSpecifiedUrlAndToken = {
        ...mockRestRequest,
        baseUrl: specifiedBaseUrl,
        token: specifiedToken,
      };

      beforeEach(() => {
        prepareApi({ instanceVersion: '17.0.0' });

        jest.mocked(fetch).mockResolvedValue(
          createFakeResponse({
            json: {},
          }),
        );
      });

      it('should validate instance version using specified base url and token', async () => {
        mockInstanceVersion('17.0.0-pre');

        const request = createFakePartial<ApiRequest<Promise<string>>>({
          ...requestWithSpecifiedUrlAndToken,
          supportedSinceInstanceVersion: {
            version: '17.2.0',
            resourceName: 'do something',
          },
        });

        await expect(api.fetchFromApi(request)).rejects.toThrow(
          `Can't do something until your instance is upgraded to 17.2.0 or higher.`,
        );

        expect(lsFetch.get).toHaveBeenCalledWith(`${specifiedBaseUrl}/api/v4/version`, {
          headers: expect.objectContaining({
            Authorization: `Bearer ${specifiedToken}`,
          }),
        });
      });

      it('should make a GET request using the specified base url and token', async () => {
        const response = await api.fetchFromApi<unknown>({
          ...requestWithSpecifiedUrlAndToken,
          type: 'rest',
          method: 'GET',
          path: '/test',
          searchParams: {
            param: '123',
            foo: 'bar',
          },
        });

        expect(response).toEqual({});
        expect(fetch).toHaveBeenCalledWith(`${specifiedBaseUrl}/api/v4/test?param=123&foo=bar`, {
          headers: expect.objectContaining({
            Authorization: `Bearer ${specifiedToken}`,
          }),
          method: 'GET',
        });
      });

      it('should make a POST request using the specified base url and token', async () => {
        const body = { foo: 'bar' };

        await api.fetchFromApi<unknown>({
          ...requestWithSpecifiedUrlAndToken,
          type: 'rest',
          method: 'POST',
          path: '/test',
          body,
        });

        expect(fetch).toHaveBeenCalledWith(`${specifiedBaseUrl}/api/v4/test`, {
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            Authorization: `Bearer ${specifiedToken}`,
            'Content-Type': 'application/json',
          }),
          method: 'POST',
        });
      });

      it('should make a PATCH request using the specified base url and token', async () => {
        const body = { foo: 'bar' };

        await api.fetchFromApi<unknown>({
          ...requestWithSpecifiedUrlAndToken,
          type: 'rest',
          method: 'PATCH',
          path: '/test',
          body,
        });

        expect(fetch).toHaveBeenCalledWith(`${specifiedBaseUrl}/api/v4/test`, {
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            Authorization: `Bearer ${specifiedToken}`,
            'Content-Type': 'application/json',
          }),
          method: 'PATCH',
        });
      });
    });

    describe('when token is provided and instance supported', () => {
      const TEST_RESPONSE_JSON = [{ id: 1 }, { id: 2 }];

      beforeEach(() => {
        prepareApi();
        jest.mocked(fetch).mockResolvedValue(
          createFakeResponse({
            json: TEST_RESPONSE_JSON,
          }),
        );
      });

      it('with successful GET request, returns parsed body from fetch', async () => {
        expect(fetch).not.toHaveBeenCalled();

        const mockGetRequest = createFakePartial<ApiRequest<unknown>>({
          type: 'rest',
          method: 'GET',
          path: '/test',
          searchParams: {
            param: '123',
            foo: 'bar',
          },
          headers: {
            'X-Test': '123',
          },
        });

        const response = await api.fetchFromApi<unknown>(mockGetRequest);

        expect(response).toEqual(TEST_RESPONSE_JSON);
        expect(fetch).toHaveBeenCalledWith(`${gitlabBaseUrl}/api/v4/test?param=123&foo=bar`, {
          headers: {
            ...headers,
            'X-Test': '123',
          },
          method: 'GET',
        });
      });

      it('with successful POST request, returns parsed body from fetch', async () => {
        expect(fetch).not.toHaveBeenCalled();

        const body = { foo: 'bar' };
        const response = await api.fetchFromApi<unknown>({
          type: 'rest',
          method: 'POST',
          path: '/test',
          body: { foo: 'bar' },
          headers: {
            'X-Test': '123',
          },
        });

        expect(response).toEqual(TEST_RESPONSE_JSON);
        expect(fetch).toHaveBeenCalledWith(`${gitlabBaseUrl}/api/v4/test`, {
          body: JSON.stringify(body),
          headers: {
            ...headers,
            'X-Test': '123',
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });
      });

      it('with successful PATCH request, returns parsed body from fetch', async () => {
        expect(fetch).not.toHaveBeenCalled();

        const body = { foo: 'bar' };
        const response = await api.fetchFromApi<unknown>({
          type: 'rest',
          method: 'PATCH',
          path: '/test',
          body: { foo: 'bar' },
          headers: {
            'X-Test': '123',
          },
        });

        expect(response).toEqual(TEST_RESPONSE_JSON);
        expect(fetch).toHaveBeenCalledWith(`${gitlabBaseUrl}/api/v4/test`, {
          body: JSON.stringify(body),
          headers: {
            ...headers,
            'X-Test': '123',
            'Content-Type': 'application/json',
          },
          method: 'PATCH',
        });
      });

      it('with failed GET request rejects', async () => {
        jest
          .mocked(fetch)
          .mockResolvedValueOnce(createFakeResponse({ url: 'response_url', status: 400 }));

        const response = api.fetchFromApi(
          createFakePartial<ApiRequest<unknown>>({
            type: 'rest',
            method: 'GET',
            path: '/test',
          }),
        );

        await expect(response).rejects.toThrow('Fetching test from response_url failed');
      });

      it('with failed POST request rejects', async () => {
        jest
          .mocked(fetch)
          .mockResolvedValueOnce(createFakeResponse({ url: 'response_url', status: 400 }));

        const response = api.fetchFromApi(
          createFakePartial<ApiRequest<unknown>>({
            type: 'rest',
            method: 'POST',
            path: '/test',
          }),
        );

        await expect(response).rejects.toThrow('Fetching resource from response_url failed');
      });

      describe('GraphQL request', () => {
        const expectedResponse = {
          data: {
            featureFlagEnabled: true,
          },
        };
        const request = createFakePartial<ApiRequest<unknown>>({
          type: 'graphql',
          query: INSTANCE_FEATURE_FLAG_QUERY,
          variables: {
            name: 'my_feature_flag',
          },
        });

        const clientRequest = jest.fn().mockResolvedValue(expectedResponse);
        const client = {
          request: clientRequest,
        };

        beforeEach(() => {
          jest.mocked(GraphQLClient as jest.Mock).mockReturnValue(client);
          (gql as jest.Mock).mockReturnValue(INSTANCE_FEATURE_FLAG_QUERY);
        });

        it('with successful graphql request, returns response', async () => {
          api = await setupKhulnaSoftApi(gitlabBaseUrl, token);

          const response = await api.fetchFromApi(request);
          expect(response).toEqual(expectedResponse);
          expect(GraphQLClient).toHaveBeenCalledWith(`${gitlabBaseUrl}/api/graphql`, {
            fetch: expect.any(Function),
            headers,
          });
          expect(clientRequest).toHaveBeenCalledWith(INSTANCE_FEATURE_FLAG_QUERY, {
            name: 'my_feature_flag',
          });
        });
      });
    });

    describe('aborted requests', () => {
      let abortController: AbortController;

      beforeEach(() => {
        prepareApi();
        abortController = new AbortController();
      });

      it.each([
        { method: 'GET', body: undefined },
        { method: 'POST', body: { foo: 'bar' } },
        { method: 'PATCH', body: { foo: 'bar' } },
      ])('should pass abort signal to REST $method requests', async ({ method, body }) => {
        await api.fetchFromApi<unknown>({
          type: 'rest',
          method: method as 'GET' | 'POST' | 'PATCH',
          path: '/test',
          ...(body && { body }),
          signal: abortController.signal,
        });

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            signal: abortController.signal,
          }),
        );
      });

      it('should handle aborted requests appropriately', async () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        jest.mocked(fetch).mockRejectedValueOnce(error);

        const promise = api.fetchFromApi<unknown>({
          type: 'rest',
          method: 'GET',
          path: '/test',
          signal: abortController.signal,
        });

        abortController.abort();

        await expect(promise).rejects.toThrow('Aborted');
      });
    });
  });

  describe('onConfigChange', () => {
    let waitForLastReconfigureEvent: Promise<ApiReconfiguredData>;
    const validTokenCheckResponse = createFakeResponse({
      json: { active: true, scopes: ['api'] },
    });
    const invalidTokenCheckResponse = createFakeResponse({
      status: 401,
    });
    beforeEach(() => {
      configService = new DefaultConfigService();
      if (!configService.onConfigChange) {
        throw new Error('issue');
      }
      api = new KhulnaSoftAPI(lsFetch, configService);
      waitForLastReconfigureEvent = new Promise((resolve) => {
        api.onApiReconfigured((data) => {
          resolve(data);
        });
      });
      lsFetch.updateAgentOptions = jest.fn();
      lsFetch.get = jest.fn();
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.mocked(lsFetch.updateAgentOptions).mockReset();
    });

    it('initializes http proxy before doing a token check', async () => {
      configService.merge({ client: { token: 'hello' } });
      await waitForLastReconfigureEvent;

      const updateAgentOptionsOrder = jest.mocked(lsFetch.updateAgentOptions).mock
        .invocationCallOrder[0];
      const checkTokenOrder = jest.mocked(lsFetch.get).mock.invocationCallOrder[0];
      expect(updateAgentOptionsOrder).toBeLessThan(checkTokenOrder);
    });

    it('when updated with valid token and baseUrl, it sends a valid config event', async () => {
      jest.mocked(lsFetch.get).mockResolvedValue(validTokenCheckResponse);

      configService.merge({ client: { token: 'hello' } });
      jest.runAllTicks();

      expect(await waitForLastReconfigureEvent).toEqual({
        isInValidState: true,
        instanceInfo: { instanceUrl: 'https://gitlab.com' },
        tokenInfo: {
          type: 'pat',
          scopes: ['api'],
        },
      });

      expect(api.tokenInfo).toEqual({ type: 'pat', scopes: ['api'] });
    });

    it('when updated with invalid token, it sends a non-valid config event', async () => {
      jest.mocked(lsFetch.get).mockResolvedValue(invalidTokenCheckResponse);

      configService.merge({ client: { token: 'hello' } });
      jest.runAllTicks();

      expect(await waitForLastReconfigureEvent).toEqual(
        expect.objectContaining({
          isInValidState: false,
          validationMessage: expect.stringMatching(/Token is invalid/),
        }),
      );
    });
  });

  describe('Instance Information', () => {
    const instanceVersion = '17.3.0-pre';
    beforeEach(() => {
      prepareApi({ instanceVersion });
    });

    it('is set when api is configured ', () => {
      expect(api.instanceInfo).toEqual({
        instanceUrl: 'https://gitlab.com',
        instanceVersion,
      });
    });
  });
});

import fetch from 'cross-fetch';
import { ApiReconfiguredData } from '@khulnasoft/core';
import { IDirectConnectionDetails, KhulnaSoftApiClient, IDirectConnectionDetailsHeaders } from '../api';
import { IDocContext } from '../document_transformer_service';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { createFakeResponse } from '../test_utils/create_fake_response';
import { log } from '../log';
import { ConfigService, DefaultConfigService, IConfig } from '../config_service';
import { SuggestionContext } from './suggestion_client';
import { DirectConnectionClient } from './direct_connection_client';

jest.mock('cross-fetch');
jest.mock('../log');
jest.mock('../../common/utils/get_language_server_version', () => ({
  getLanguageServerVersion: jest.fn().mockReturnValue('1.2.3.4.5'),
}));

describe('DirectConnectionClient', () => {
  let api: KhulnaSoftApiClient;
  let context: SuggestionContext;
  let client: DirectConnectionClient;
  let configService: ConfigService;

  const successfulSuggestionResponse = { status: 200 };

  beforeEach(() => {
    jest.useFakeTimers();
    context = createFakePartial<SuggestionContext>({
      document: createFakePartial<IDocContext>({}),
    });
    api = createFakePartial<KhulnaSoftApiClient>({
      onApiReconfigured: jest.fn(),
    });
    configService = new DefaultConfigService();
    client = new DirectConnectionClient(api, configService);
  });

  afterEach(() => {
    jest.runAllTicks();
  });

  const mockFetchResponse = (status: number, json: unknown) =>
    jest.mocked(fetch).mockResolvedValue(createFakeResponse({ status, json }));

  describe('fetching direct connection details', () => {
    const directConnectionDetails = createFakePartial<IDirectConnectionDetails>({
      token: 'abc',
      headers: createFakePartial<IDirectConnectionDetailsHeaders>({
        'X-Gitlab-Instance-Id': 'instance-id',
      }),
    });

    beforeEach(() => {
      api = createFakePartial<KhulnaSoftApiClient>({
        fetchFromApi: jest.fn().mockResolvedValue(directConnectionDetails),
        onApiReconfigured: jest.fn(),
      });
      client = new DirectConnectionClient(api, configService);
      mockFetchResponse(200, successfulSuggestionResponse);
    });

    it('fetches connection details without awaiting', async () => {
      const result = await client.getSuggestions(context);

      expect(result).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();

      jest.runAllTicks();

      expect(api.fetchFromApi).toHaveBeenCalled();
    });

    it('opens the circuit breaker', async () => {
      api.fetchFromApi = jest.fn().mockRejectedValue(new Error('test error'));

      await client.getSuggestions(context);
      await client.getSuggestions(context);

      expect(api.fetchFromApi).toHaveBeenCalledTimes(1);
    });

    it('updates config service with the direct connection details', async () => {
      const listener = jest.fn();
      configService.onConfigChange(listener);
      await client.getSuggestions(context);

      jest.runAllTicks();

      expect(
        (listener.mock.calls[0][0] as IConfig).client.snowplowTrackerOptions?.gitlab_instance_id,
      ).toBe(directConnectionDetails.headers['X-Gitlab-Instance-Id']);
    });
  });

  describe('reacting to API client reconfiguration', () => {
    let reconfigurationListener: (data: ApiReconfiguredData) => void;

    beforeEach(() => {
      api = createFakePartial<KhulnaSoftApiClient>({
        fetchFromApi: jest
          .fn()
          .mockResolvedValue(createFakePartial<IDirectConnectionDetails>({ token: 'abc' })),
        onApiReconfigured: (l) => {
          reconfigurationListener = l;
          return { dispose: () => {} };
        },
      });
      client = new DirectConnectionClient(api, configService);
    });

    it('it clears out the connection details', async () => {
      await client.getSuggestions(context);
      await client.getSuggestions(context);

      expect(api.fetchFromApi).toHaveBeenCalledTimes(1);

      reconfigurationListener(createFakePartial<ApiReconfiguredData>({ isInValidState: true }));

      await client.getSuggestions(context);
      // the increased count proves that we dropped the connection details and had to fetch them again
      expect(api.fetchFromApi).toHaveBeenCalledTimes(2);
    });

    it('it does not use API when API client is not in valid state', async () => {
      reconfigurationListener({ isInValidState: false, validationMessage: 'error' });

      await client.getSuggestions(context);
      expect(api.fetchFromApi).toHaveBeenCalledTimes(0);
    });

    it('opens circuit breaker when API client is in valid state', async () => {
      reconfigurationListener(createFakePartial<ApiReconfiguredData>({ isInValidState: true }));

      await client.getSuggestions(context);
      expect(api.fetchFromApi).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetching suggestions directly', () => {
    const TEST_EXPIRES_AT_S = 1713343569;
    const TEST_EXPIRES_AT_MS = TEST_EXPIRES_AT_S * 1000;
    const SECOND = 1000;

    beforeEach(async () => {
      jest.setSystemTime(new Date(TEST_EXPIRES_AT_MS - 60 * SECOND));
      api = createFakePartial<KhulnaSoftApiClient>({
        fetchFromApi: jest.fn().mockResolvedValue(
          createFakePartial<IDirectConnectionDetails>({
            token: 'abc',
            expires_at: TEST_EXPIRES_AT_S,
          }),
        ),
        onApiReconfigured: jest.fn(),
      });
      client = new DirectConnectionClient(api, configService);
      mockFetchResponse(200, successfulSuggestionResponse);
      // prime the direct connection details with first request
      await client.getSuggestions(context);
    });

    it('returns undefined when intent is generation', async () => {
      const result = await client.getSuggestions({ ...context, intent: 'generation' });
      expect(result).toBeUndefined();
    });

    it('fetches suggestions using direct connection', async () => {
      const result = await client.getSuggestions(context);
      expect(result).toEqual(expect.objectContaining(successfulSuggestionResponse));
    });

    it('sets keep-alive to true for the fetch', async () => {
      await client.getSuggestions(context);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keepalive: true }),
      );
    });

    it('sets "X-Gitlab-Language-Server-Version" header for the fetch', async () => {
      await client.getSuggestions(context);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Gitlab-Language-Server-Version': '1.2.3.4.5' }),
        }),
      );
    });

    it('sets "User-Agent" header for the fetch', async () => {
      configService.set('client.clientInfo', { name: 'test-ide', version: '6.7.8' });
      await client.getSuggestions(context);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'gitlab-language-server:1.2.3.4.5 (test-ide:6.7.8)',
          }),
        }),
      );
    });

    it('suggestion response from this client have direct has isDirectConnection set to true', async () => {
      const result = await client.getSuggestions(context);
      expect(result).toEqual(expect.objectContaining({ isDirectConnection: true }));
    });

    it('handles error from direct connection', async () => {
      jest.mocked(fetch).mockResolvedValue(
        createFakeResponse({
          status: 500,
          json: {
            error: 'test error',
          },
        }),
      );

      const result = await client.getSuggestions(context);
      expect(result).toEqual(undefined);
      expect(log.warn).toHaveBeenCalledWith(expect.stringMatching(/failed/), expect.any(Error));
    });

    it('refreshes connection details if the token expired', async () => {
      // we refresh a bit sooner than the token expires (40s)
      jest.setSystemTime(new Date(TEST_EXPIRES_AT_MS - 39 * SECOND));

      const result = await client.getSuggestions(context);

      expect(result).toEqual(undefined);
    });
  });
});

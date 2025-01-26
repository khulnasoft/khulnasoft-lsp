import { ApiReconfiguredData } from '@khulnasoft/core';
import { KhulnaSoftApiClient } from './api';
import { ConfigService, IConfig } from './config_service';
import {
  ClientFeatureFlags,
  DefaultFeatureFlagService,
  FeatureFlagService,
  InstanceFeatureFlags,
} from './feature_flags';
import { createFakePartial } from './test_utils/create_fake_partial';

jest.useFakeTimers();

describe('DefaultFeatureFlagService', () => {
  let api: KhulnaSoftApiClient;
  let featureFlagService: FeatureFlagService;
  let configService: ConfigService;

  beforeEach(() => {
    api = createFakePartial<KhulnaSoftApiClient>({
      fetchFromApi: jest.fn(),
      onApiReconfigured: jest.fn(),
    });
    configService = createFakePartial<ConfigService>({ get: jest.fn() });
    featureFlagService = new DefaultFeatureFlagService(api, configService);
  });

  describe('updateInstanceFeatureFlags', () => {
    beforeEach(() => {
      const mockFetchFromApi = jest.mocked(api.fetchFromApi);
      mockFetchFromApi.mockResolvedValueOnce({ featureFlagEnabled: true });
      mockFetchFromApi.mockResolvedValue({ featureFlagEnabled: false });
    });

    it('should populate the feature flags cache', async () => {
      await featureFlagService.updateInstanceFeatureFlags();

      expect(api.fetchFromApi).toHaveBeenCalledTimes(Object.values(InstanceFeatureFlags).length);
      expect(api.fetchFromApi).toHaveBeenCalledWith({
        query: expect.any(String),
        type: 'graphql',
        variables: { name: InstanceFeatureFlags.EditorAdvancedContext },
      });
      expect(api.fetchFromApi).toHaveBeenCalledWith({
        query: expect.any(String),
        type: 'graphql',
        variables: { name: InstanceFeatureFlags.CodeSuggestionsContext },
      });
    });

    it('should re-fetch instance flags when API is reconfigured', async () => {
      await featureFlagService.updateInstanceFeatureFlags();
      jest.mocked(api.fetchFromApi).mockReset();

      const reconfigureListener = jest.mocked(api.onApiReconfigured).mock.calls[0][0];
      // the listener is actually async and we should await it in this test
      await reconfigureListener(createFakePartial<ApiReconfiguredData>({ isInValidState: true }));

      expect(api.fetchFromApi).toHaveBeenCalledTimes(Object.values(InstanceFeatureFlags).length);
      expect(api.fetchFromApi).toHaveBeenCalledWith({
        query: expect.any(String),
        type: 'graphql',
        variables: { name: InstanceFeatureFlags.EditorAdvancedContext },
      });
      expect(api.fetchFromApi).toHaveBeenCalledWith({
        query: expect.any(String),
        type: 'graphql',
        variables: { name: InstanceFeatureFlags.CodeSuggestionsContext },
      });
    });

    it('should throttle re-fetch and only make one request when called many times rapidly', async () => {
      for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await featureFlagService.updateInstanceFeatureFlags();
      }

      expect(api.fetchFromApi).toHaveBeenCalledTimes(Object.values(InstanceFeatureFlags).length);
    });
  });

  describe('isInstanceFlagEnabled', () => {
    it('should return the cached value if available', async () => {
      const mockFetchFromApi = jest.mocked(api.fetchFromApi);
      mockFetchFromApi.mockResolvedValue({ featureFlagEnabled: true });

      await featureFlagService.updateInstanceFeatureFlags();

      const result = featureFlagService.isInstanceFlagEnabled(
        InstanceFeatureFlags.EditorAdvancedContext,
      );

      expect(result).toBe(true);
      expect(mockFetchFromApi).toHaveBeenCalledTimes(Object.values(InstanceFeatureFlags).length);
    });

    it('should return false if not enabled', async () => {
      const mockFetchFromApi = jest.mocked(api.fetchFromApi);
      mockFetchFromApi.mockResolvedValue({ featureFlagEnabled: false });

      await featureFlagService.updateInstanceFeatureFlags();

      const result = featureFlagService.isInstanceFlagEnabled(
        InstanceFeatureFlags.EditorAdvancedContext,
      );

      expect(result).toBe(false);
    });

    it('should return false if not in cache', async () => {
      const result = featureFlagService.isInstanceFlagEnabled(
        InstanceFeatureFlags.CodeSuggestionsContext,
      );

      expect(result).toBe(false);
    });
  });

  describe('isClientFlagEnabled', () => {
    it('should return the client flag if available', () => {
      const mockConfig = createFakePartial<IConfig['client']['featureFlags']>({
        [ClientFeatureFlags.StreamCodeGenerations]: true,
      });
      const mockGet = jest.mocked(configService.get).mockImplementation((key: string) => {
        return key === 'client.featureFlags' ? (mockConfig as unknown as undefined) : undefined;
      });

      const result = featureFlagService.isClientFlagEnabled(
        ClientFeatureFlags.StreamCodeGenerations,
      );

      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenNthCalledWith(1, 'client.featureFlagOverrides');
      expect(mockGet).toHaveBeenNthCalledWith(2, 'client.featureFlags');
    });

    it('should return false if the client flag is not available', () => {
      const mockGet = jest.mocked(configService.get);
      mockGet.mockReturnValue({} as unknown as undefined);

      const result = featureFlagService.isClientFlagEnabled(
        ClientFeatureFlags.StreamCodeGenerations,
      );

      expect(result).toBe(false);
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenNthCalledWith(1, 'client.featureFlagOverrides');
      expect(mockGet).toHaveBeenNthCalledWith(2, 'client.featureFlags');
    });
  });

  describe('featureFlagOverrides', () => {
    it('should override an instance feature flag', () => {
      const mockConfig = createFakePartial<IConfig['client']['featureFlags']>({
        [InstanceFeatureFlags.EditorAdvancedContext]: true,
      });

      jest.mocked(configService.get).mockImplementation((key: string) => {
        return key === 'client.featureFlagOverrides'
          ? (mockConfig as unknown as undefined)
          : undefined;
      });

      const result = featureFlagService.isInstanceFlagEnabled(
        InstanceFeatureFlags.EditorAdvancedContext,
      );

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('client.featureFlagOverrides');
    });

    it('should override a client feature flag', () => {
      const mockConfig = createFakePartial<IConfig['client']['featureFlags']>({
        [ClientFeatureFlags.StreamCodeGenerations]: true,
      });

      jest.mocked(configService.get).mockImplementation((key: string) => {
        return key === 'client.featureFlagOverrides'
          ? (mockConfig as unknown as undefined)
          : undefined;
      });

      const result = featureFlagService.isClientFlagEnabled(
        ClientFeatureFlags.StreamCodeGenerations,
      );

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('client.featureFlagOverrides');
      expect(configService.get).not.toHaveBeenCalledWith('client.featureFlags');
    });
  });
});

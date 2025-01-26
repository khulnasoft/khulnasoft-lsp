import { ApiReconfiguredData, KhulnaSoftApiService, InstanceInfo } from '@khulnasoft/core';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { DefaultDuoFeatureAccessService, DuoFeature } from './duo_feature_access_service';

describe('DuoFeatureAccessService', () => {
  let service: DefaultDuoFeatureAccessService;
  let mockKhulnaSoftApiService: KhulnaSoftApiService;

  describe('isFeatureEnabled', () => {
    describe('when the API is correctly configured', () => {
      beforeEach(() => {
        mockKhulnaSoftApiService = createFakePartial<KhulnaSoftApiService>({
          fetchFromApi: jest.fn(),
          onApiReconfigured: jest.fn(),
          instanceInfo: createFakePartial<InstanceInfo>({ instanceVersion: '17.6.0' }),
        });
        service = new DefaultDuoFeatureAccessService(mockKhulnaSoftApiService);
      });

      it('allows providers with no feature requirements', async () => {
        const requiredFeature = undefined;
        const result = await service.isFeatureEnabled(requiredFeature);

        expect(result).toEqual({ enabled: true });
        expect(mockKhulnaSoftApiService.fetchFromApi).not.toHaveBeenCalled();
      });

      it('fetches features only once for multiple checks', async () => {
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
          currentUser: {
            duoChatAvailableFeatures: [DuoFeature.IncludeIssueContext],
          },
        });

        await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);
        await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);

        expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledTimes(1);
      });

      it('re-fetches features after API reconfiguration', async () => {
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
          currentUser: {
            duoChatAvailableFeatures: [DuoFeature.IncludeIssueContext],
          },
        });

        await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);
        expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledTimes(1);

        const callback = jest.mocked(mockKhulnaSoftApiService.onApiReconfigured).mock.calls[0][0];
        callback(createFakePartial<ApiReconfiguredData>({}));

        await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);
        expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledTimes(2);
      });

      it.each([
        DuoFeature.IncludeFileContext,
        DuoFeature.IncludeFileContext,
        DuoFeature.IncludeIssueContext,
        DuoFeature.IncludeMergeRequestContext,
        'include_dependency_context',
      ] as DuoFeature[])('maps %s provider to %s feature', async (requiredFeature) => {
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
          currentUser: {
            duoChatAvailableFeatures: [requiredFeature],
          },
        });

        const result = await service.isFeatureEnabled(requiredFeature);
        expect(result).toEqual({ enabled: true });
      });

      it('disables providers when required feature is not available', async () => {
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
          currentUser: {
            duoChatAvailableFeatures: [DuoFeature.IncludeFileContext],
          },
        });

        const result = await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);
        expect(result).toEqual({
          enabled: false,
          disabledReasons: ['Feature "include_issue_context" is not enabled'],
        });
      });

      it('disables all feature-gated providers on API error', async () => {
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockRejectedValue(new Error('API Error'));

        const result = await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);
        expect(result).toEqual({
          enabled: false,
          disabledReasons: ['Feature "include_issue_context" is not enabled'],
        });
      });

      it('makes correct GraphQL query', async () => {
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
          currentUser: { duoChatAvailableFeatures: [] },
        });

        await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);

        expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledWith({
          type: 'graphql',
          query: expect.stringContaining('duoChatAvailableFeatures'),
          variables: {},
          supportedSinceInstanceVersion: {
            version: '17.6.0',
            resourceName: 'get Duo Chat available features',
          },
        });
      });

      describe('provider feature requirements', () => {
        it.each([
          DuoFeature.IncludeFileContext,
          DuoFeature.IncludeFileContext,
          DuoFeature.IncludeIssueContext,
          DuoFeature.IncludeMergeRequestContext,
          'include_dependency_context',
        ] as DuoFeature[])('%s provider requires correct feature', async (requiredFeature) => {
          jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
            currentUser: {
              duoChatAvailableFeatures: [requiredFeature],
            },
          });

          const result = await service.isFeatureEnabled(requiredFeature);
          expect(result.enabled).toBe(true);
        });
      });

      describe('caching behavior', () => {
        it('caches negative results', async () => {
          jest
            .mocked(mockKhulnaSoftApiService.fetchFromApi)
            .mockRejectedValueOnce(new Error('API Error'));

          await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);
          await service.isFeatureEnabled(DuoFeature.IncludeIssueContext);

          expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledTimes(1);
        });

        it('uses same promise for concurrent requests', async () => {
          jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
            currentUser: {
              duoChatAvailableFeatures: [DuoFeature.IncludeIssueContext],
            },
          });

          await Promise.all([
            service.isFeatureEnabled(DuoFeature.IncludeIssueContext),
            service.isFeatureEnabled(DuoFeature.IncludeIssueContext),
            service.isFeatureEnabled(DuoFeature.IncludeMergeRequestContext),
            service.isFeatureEnabled(DuoFeature.IncludeFileContext),
          ]);

          expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('when the API has not yet been correctly configured', () => {
      beforeEach(() => {
        mockKhulnaSoftApiService = createFakePartial<KhulnaSoftApiService>({
          fetchFromApi: jest.fn(),
          onApiReconfigured: jest.fn().mockReturnValue({ dispose: jest.fn() }),
          instanceInfo: undefined, // Simulate uninitialized API
        });
        service = new DefaultDuoFeatureAccessService(mockKhulnaSoftApiService);
      });

      it('waits for API configuration when instanceInfo is not available', async () => {
        const disposeMock = jest.fn();
        jest.mocked(mockKhulnaSoftApiService.onApiReconfigured).mockReturnValue({
          dispose: disposeMock,
        });
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
          currentUser: {
            duoChatAvailableFeatures: [DuoFeature.IncludeIssueContext],
          },
        });
        const featuresPromise = service.isFeatureEnabled(DuoFeature.IncludeIssueContext);

        const mockApiReconfiguredCallback = jest.mocked(mockKhulnaSoftApiService.onApiReconfigured).mock
          .calls[1][0];

        Object.defineProperty(mockKhulnaSoftApiService, 'instanceInfo', {
          get: () =>
            createFakePartial<InstanceInfo>({
              instanceVersion: '17.6.0',
            }),
        });
        mockApiReconfiguredCallback(createFakePartial<ApiReconfiguredData>({}));

        const result = await featuresPromise;

        expect(result).toEqual({ enabled: true });
        expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledTimes(1);
        expect(disposeMock).toHaveBeenCalled();
      });

      it('handles multiple concurrent requests while waiting for API configuration', async () => {
        jest.mocked(mockKhulnaSoftApiService.fetchFromApi).mockResolvedValue({
          currentUser: {
            duoChatAvailableFeatures: [
              DuoFeature.IncludeIssueContext,
              DuoFeature.IncludeMergeRequestContext,
            ],
          },
        });

        const promise1 = service.isFeatureEnabled(DuoFeature.IncludeIssueContext);
        const promise2 = service.isFeatureEnabled(DuoFeature.IncludeMergeRequestContext);

        const mockApiReconfiguredCallback = jest.mocked(mockKhulnaSoftApiService.onApiReconfigured).mock
          .calls[1][0];

        Object.defineProperty(mockKhulnaSoftApiService, 'instanceInfo', {
          get: () =>
            createFakePartial<InstanceInfo>({
              instanceVersion: '17.6.0',
            }),
        });
        mockApiReconfiguredCallback(createFakePartial<ApiReconfiguredData>({}));

        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(result1).toEqual({ enabled: true });
        expect(result2).toEqual({ enabled: true });
        expect(mockKhulnaSoftApiService.fetchFromApi).toHaveBeenCalledTimes(1);
      });
    });
  });
});

import { ApiReconfiguredData } from '@khulnasoft/core';
import { KhulnaSoftApiClient } from '../../api';
import { KhulnaSoftProjectId } from '../../api_types';
import { toKhulnaSoftGid } from '../../graphql/gid_utils';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import {
  DefaultDuoApiProjectAccessCache,
  DuoApiProjectAccessCache,
  DuoApiProjectAccessGqlResponse,
} from './api_project_access_cache';

describe('DefaultDuoApiProjectAccessCache', () => {
  let mockKhulnaSoftApiClient: KhulnaSoftApiClient;
  let duoApiProjectAccessCache: DuoApiProjectAccessCache;
  let onApiReconfiguredCallback: (data: ApiReconfiguredData) => void;

  const projectId = 123;
  const projectGid = toKhulnaSoftGid('Project', projectId);

  function mockApiResponse(id: KhulnaSoftProjectId, enabled: boolean) {
    jest.mocked(mockKhulnaSoftApiClient.fetchFromApi).mockResolvedValue({
      projects: {
        edges: [{ node: { id: toKhulnaSoftGid('Project', id), duoFeaturesEnabled: enabled } }],
      },
    } satisfies DuoApiProjectAccessGqlResponse);
  }

  beforeEach(() => {
    mockKhulnaSoftApiClient = createFakePartial<KhulnaSoftApiClient>({
      fetchFromApi: jest.fn(),
      onApiReconfigured: jest.fn().mockImplementation((listener) => {
        onApiReconfiguredCallback = listener;
        return { dispose: jest.fn() };
      }),
    });
    duoApiProjectAccessCache = new DefaultDuoApiProjectAccessCache(mockKhulnaSoftApiClient);
  });

  describe('populateCacheByIds', () => {
    describe('when a project is already cached', () => {
      beforeEach(async () => {
        mockApiResponse(projectId, true);
        await duoApiProjectAccessCache.getEnabledForProjects([projectId]);

        jest.mocked(mockKhulnaSoftApiClient.fetchFromApi).mockReset();
      });

      it('does not try to fetch the project again', async () => {
        await duoApiProjectAccessCache.getEnabledForProjects([projectId]);

        expect(mockKhulnaSoftApiClient.fetchFromApi).not.toHaveBeenCalled();
      });
    });

    describe('when a project is not yet cached', () => {
      beforeEach(() => {
        mockApiResponse(projectId, true);
      });

      it('makes network request for the Duo status', async () => {
        await duoApiProjectAccessCache.getEnabledForProjects([projectId]);

        expect(mockKhulnaSoftApiClient.fetchFromApi).toHaveBeenCalledTimes(1);
        expect(mockKhulnaSoftApiClient.fetchFromApi).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: {
              projectIds: [projectGid],
            },
          }),
        );
      });

      it('returns "false" if the network request fails', async () => {
        jest.mocked(mockKhulnaSoftApiClient.fetchFromApi).mockRejectedValue(new Error('ruh roh'));

        const result = await duoApiProjectAccessCache.getEnabledForProjects([projectId]);

        expect(result).toMatchObject({ [projectId]: false });
      });

      describe('and the cache has other project statuses', () => {
        beforeEach(async () => {
          await duoApiProjectAccessCache.getEnabledForProjects([projectId]);
          jest.mocked(mockKhulnaSoftApiClient.fetchFromApi).mockReset();
        });

        it('does only requests Duo status for the missing project', async () => {
          const missingProjectId = 9876;
          const missingProjectGid = toKhulnaSoftGid('Project', missingProjectId);
          mockApiResponse(missingProjectId, true);

          await duoApiProjectAccessCache.getEnabledForProjects([projectId, missingProjectId]);

          expect(mockKhulnaSoftApiClient.fetchFromApi).toHaveBeenCalledTimes(1);
          expect(mockKhulnaSoftApiClient.fetchFromApi).toHaveBeenCalledWith(
            expect.objectContaining({
              variables: {
                projectIds: [missingProjectGid],
              },
            }),
          );
        });
      });
    });
  });

  describe('when API is reconfigured', () => {
    beforeEach(() => {
      mockApiResponse(projectId, true);
    });

    it('clears the cache', async () => {
      await duoApiProjectAccessCache.getEnabledForProjects([projectId]);
      expect(mockKhulnaSoftApiClient.fetchFromApi).toHaveBeenCalledTimes(1); // fetch
      await duoApiProjectAccessCache.getEnabledForProjects([projectId]);
      expect(mockKhulnaSoftApiClient.fetchFromApi).toHaveBeenCalledTimes(1); // use cached value

      onApiReconfiguredCallback(createFakePartial<ApiReconfiguredData>({}));

      await duoApiProjectAccessCache.getEnabledForProjects([projectId]);
      expect(mockKhulnaSoftApiClient.fetchFromApi).toHaveBeenCalledTimes(2); // re-fetch
    });
  });
});

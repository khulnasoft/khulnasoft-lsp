import { KhulnaSoftGID } from '../../graphql/gid_utils';
import { DuoProjectAccessChecker } from '../../services/duo_access';
import type { DuoFeatureAccessService } from '../../services/duo_access/duo_feature_access_service';
import { DuoProjectStatus } from '../../services/duo_access/project_access_checker';
import {
  type MergeRequestDetails,
  MergeRequestService,
  type RestMergeRequestSearchResult,
} from '../../services/gitlab';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { AbstractAIContextProvider } from '../ai_context_provider';
import { getAdvancedContextContentLimit } from './utils';
import type {
  MergeRequestAIContextItem,
  MergeRequestContextProvider,
  MergeRequestMetadata,
} from './merge_request';
import { DefaultMergeRequestContextProvider } from './merge_request';
import { formatIssuableHeader, formatIssuableNotes } from './format_issueables';

jest.mock('./format_issueables', () => ({
  formatIssuableHeader: jest.fn().mockReturnValue('formatted header'),
  formatIssuableNotes: jest.fn().mockReturnValue('formatted notes'),
}));

jest.mock('../../utils/async_debounce', () => ({
  asyncDebounce: jest.fn((fn) => fn),
}));

jest.mock('./utils', () => ({
  getAdvancedContextContentLimit: jest.fn(() => 1000),
}));

describe('MergeRequestContextProvider', () => {
  let mergeRequestProvider: MergeRequestContextProvider;
  let mockMergeRequestService: MergeRequestService;
  let mockDuoProjectAccessChecker: DuoProjectAccessChecker;
  let mockDuoFeatureAccessService: DuoFeatureAccessService;

  const mockMergeRequestDetails = createFakePartial<MergeRequestDetails>({
    title: 'Test MR',
    state: 'opened',
    description: 'Test description',
    commits: {
      nodes: [
        {
          diffs: [
            {
              oldPath: 'old/path',
              newPath: 'new/path',
              diff: 'test diff content',
            },
          ],
        },
      ],
    },
    discussions: {
      nodes: [
        {
          notes: {
            nodes: [
              {
                body: 'Test comment',
                createdAt: '2024-01-01T00:00:00Z',
                author: {
                  username: 'test_author',
                },
              },
            ],
          },
        },
      ],
    },
  });

  beforeEach(() => {
    mockDuoProjectAccessChecker = createFakePartial<DuoProjectAccessChecker>({
      checkProjectStatusesByIds: jest.fn(),
    });
    mockMergeRequestService = createFakePartial<MergeRequestService>({
      searchMergeRequests: jest.fn(),
      getCurrentUsersMergeRequests: jest.fn(),
      getMergeRequestDetails: jest.fn(),
    });
    mockDuoFeatureAccessService = createFakePartial<DuoFeatureAccessService>({
      isFeatureEnabled: jest.fn(),
    });

    mergeRequestProvider = new DefaultMergeRequestContextProvider(
      mockDuoProjectAccessChecker,
      mockMergeRequestService,
      mockDuoFeatureAccessService,
    );
  });

  it('correctly creates a mergeRequestProvider instance with the `merge_request` type', () => {
    expect(mergeRequestProvider).toBeInstanceOf(DefaultMergeRequestContextProvider);
    expect(mergeRequestProvider).toBeInstanceOf(AbstractAIContextProvider);
    expect(mergeRequestProvider.type).toBe('merge_request');
  });

  describe('searchContextItems', () => {
    it('excludes merge requests from results which have already been selected', async () => {
      const alreadySelectedSearchResult = createFakePartial<RestMergeRequestSearchResult>({
        id: 1234,
        project_id: 9999,
      });
      const newSearchResult = createFakePartial<RestMergeRequestSearchResult>({
        id: 5678,
        project_id: 8888,
      });
      const selectedItem = createFakePartial<MergeRequestAIContextItem>({
        id: 'gid://gitlab/MergeRequest/1234',
        category: 'merge_request',
        metadata: createFakePartial<MergeRequestMetadata>({ subType: 'merge_request' }),
      });
      jest
        .mocked(mockDuoProjectAccessChecker.checkProjectStatusesByIds)
        .mockResolvedValue({ 8888: DuoProjectStatus.DuoEnabled });
      jest
        .mocked(mockMergeRequestService.searchMergeRequests)
        .mockResolvedValue([alreadySelectedSearchResult, newSearchResult]);
      await mergeRequestProvider.addSelectedContextItem(selectedItem);

      const results = await mergeRequestProvider.searchContextItems({
        category: 'merge_request',
        query: 'test',
        workspaceFolders: [],
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('gid://gitlab/MergeRequest/5678');
    });

    describe.each([
      {
        testCase: 'when search query is empty',
        query: '',
        getServiceMethod: () => mockMergeRequestService.getCurrentUsersMergeRequests,
        expectedArgs: [25],
      },
      {
        testCase: 'when search query has a value',
        query: 'test',
        getServiceMethod: () => mockMergeRequestService.searchMergeRequests,
        expectedArgs: ['test', 25],
      },
    ])('$testCase', ({ query, getServiceMethod, expectedArgs }) => {
      let serviceMethod:
        | MergeRequestService['searchMergeRequests']
        | MergeRequestService['getCurrentUsersMergeRequests'];

      beforeEach(() => {
        serviceMethod = getServiceMethod();
      });

      it('calls merge request service', async () => {
        jest.mocked(serviceMethod).mockResolvedValue([]);
        jest.mocked(mockDuoProjectAccessChecker.checkProjectStatusesByIds).mockResolvedValue({});

        await mergeRequestProvider.searchContextItems({
          category: 'merge_request',
          query,
          workspaceFolders: [],
        });

        expect(serviceMethod).toHaveBeenCalledTimes(1);
        expect(serviceMethod).toHaveBeenCalledWith(...expectedArgs);
      });

      it.each([
        { duoEnabled: true, expectedEnabled: true, expectedDisabledReasons: [] },
        {
          duoEnabled: false,
          expectedEnabled: false,
          expectedDisabledReasons: ['project disabled'],
        },
      ])(
        'handles DuoProjectStatus correctly (enabled: $duoEnabled)',
        async ({ duoEnabled, expectedEnabled, expectedDisabledReasons }) => {
          const projectId = 1;
          const mockMergeRequest = createFakePartial<RestMergeRequestSearchResult>({
            id: 1,
            iid: 2,
            project_id: projectId,
            title: 'Test MR',
            web_url: 'https://gitlab.com/test/project/-/merge_requests/1',
          });

          jest.mocked(serviceMethod).mockResolvedValue([mockMergeRequest]);
          jest.mocked(mockDuoProjectAccessChecker.checkProjectStatusesByIds).mockResolvedValue({
            [projectId]: duoEnabled ? DuoProjectStatus.DuoEnabled : DuoProjectStatus.DuoDisabled,
          });

          const results = await mergeRequestProvider.searchContextItems({
            category: 'merge_request',
            query,
            workspaceFolders: [],
          });

          expect(results).toHaveLength(1);
          expect(results[0].metadata.enabled).toBe(expectedEnabled);
          expect(results[0].metadata.disabledReasons).toEqual(expectedDisabledReasons);
        },
      );

      it('maps result to expected context item structure', async () => {
        const projectId = 1;
        const mockMergeRequest = createFakePartial<RestMergeRequestSearchResult>({
          id: 1111,
          iid: 2222,
          project_id: projectId,
          title: 'Test MR',
          web_url: 'https://gitlab.com/test/project/-/merge_requests/1111',
        });

        jest.mocked(serviceMethod).mockResolvedValue([mockMergeRequest]);
        jest.mocked(mockDuoProjectAccessChecker.checkProjectStatusesByIds).mockResolvedValue({
          [projectId]: DuoProjectStatus.DuoEnabled,
        });

        const results = await mergeRequestProvider.searchContextItems({
          category: 'merge_request',
          query,
          workspaceFolders: [],
        });

        expect(results[0]).toMatchObject({
          id: 'gid://gitlab/MergeRequest/1111',
          category: 'merge_request',
          metadata: {
            enabled: true,
            disabledReasons: [],
            subType: 'merge_request',
            subTypeLabel: 'Merge request',
            title: 'Test MR',
            secondaryText: 'test/project!2222',
            webUrl: 'https://gitlab.com/test/project/-/merge_requests/1111',
          },
        });
      });

      it('limits search results to 25 items', async () => {
        const mockMergeRequests = Array.from({ length: 30 }, (_, i) =>
          createFakePartial<RestMergeRequestSearchResult>({
            id: i + 1,
            project_id: i + 1,
            title: `Test MR ${i + 1}`,
            web_url: `https://gitlab.com/test/project/-/merge_requests/${i + 1}`,
          }),
        );

        jest.mocked(serviceMethod).mockResolvedValue(mockMergeRequests);
        jest
          .mocked(mockDuoProjectAccessChecker.checkProjectStatusesByIds)
          .mockResolvedValue(
            Object.fromEntries(
              mockMergeRequests.map((mr) => [mr.project_id, DuoProjectStatus.DuoEnabled]),
            ),
          );

        const results = await mergeRequestProvider.searchContextItems({
          category: 'merge_request',
          query,
          workspaceFolders: [],
        });

        expect(results).toHaveLength(25);
      });

      it('handles search service errors gracefully', async () => {
        jest.mocked(serviceMethod).mockRejectedValue(new Error('Search failed'));

        const results = await mergeRequestProvider.searchContextItems({
          category: 'merge_request',
          query,
          workspaceFolders: [],
        });

        expect(results).toEqual([]);
      });
    });
  });

  describe('retrieveSelectedContextItemsWithContent', () => {
    const selectedItem = createFakePartial<MergeRequestAIContextItem>({
      id: 'gid://gitlab/MergeRequest/1234',
      category: 'merge_request',
      metadata: createFakePartial<MergeRequestMetadata>({
        subType: 'merge_request',
      }),
    });

    beforeEach(() => mergeRequestProvider.addSelectedContextItem(selectedItem));

    it('handles errors gracefully when retrieving content fails', async () => {
      jest
        .mocked(mockMergeRequestService.getMergeRequestDetails)
        .mockRejectedValue(new Error('Failed to get MR'));

      const results = await mergeRequestProvider.retrieveSelectedContextItemsWithContent();

      expect(results).toHaveLength(1);
      expect(results[0].content).toBeUndefined();
    });

    it('splits character limits for diffs and notes between attached MRs', async () => {
      jest.mocked(getAdvancedContextContentLimit).mockReturnValue(100);
      const expectedMaxChars = 25;

      const longDiff = 'a'.repeat(150);
      const longNote = 'b'.repeat(150);

      const mockMRWithLongContent1 = createFakePartial<MergeRequestDetails>({
        ...mockMergeRequestDetails,
        commits: {
          nodes: [
            {
              diffs: Array.from({ length: 3 }, (_, i) => ({
                oldPath: `file${i}.ts`,
                newPath: `file${i}.ts`,
                diff: longDiff,
              })),
            },
          ],
        },
        discussions: {
          nodes: [
            {
              notes: {
                nodes: Array.from({ length: 3 }, (_, i) => ({
                  body: longNote,
                  createdAt: `2024-01-0${i + 1}T00:00:00Z`,
                  author: { username: `user${i}` },
                })),
              },
            },
          ],
        },
      });
      const mockMRWithLongContent2 = {
        ...mockMRWithLongContent1,
      };
      await mergeRequestProvider.addSelectedContextItem(
        createFakePartial<MergeRequestAIContextItem>({
          id: `gid://gitlab/MergeRequest/1`,
          metadata: createFakePartial<MergeRequestMetadata>({
            subType: 'merge_request',
          }),
        }),
      );
      await mergeRequestProvider.addSelectedContextItem(
        createFakePartial<MergeRequestAIContextItem>({
          id: `gid://gitlab/MergeRequest/2`,
          metadata: createFakePartial<MergeRequestMetadata>({
            subType: 'merge_request',
          }),
        }),
      );

      jest
        .mocked(mockMergeRequestService.getMergeRequestDetails)
        .mockImplementation((id: KhulnaSoftGID) =>
          Promise.resolve(
            id === `gid://gitlab/MergeRequest/1` ? mockMRWithLongContent1 : mockMRWithLongContent2,
          ),
        );

      const results = await mergeRequestProvider.retrieveSelectedContextItemsWithContent();

      for (const result of results) {
        // Split content into diffs and notes sections
        const [, diffSection, noteSection] = result
          .content!.split(/(?:Changes:\n|Comments:\n)/)
          .map((section) => section.trim());

        expect(diffSection.length).toBeLessThanOrEqual(expectedMaxChars);
        expect(diffSection).toContain('file0.ts'); // should only include first diff due to limit
        expect(diffSection).not.toContain('file1.ts');

        expect(noteSection.length).toBeLessThanOrEqual(expectedMaxChars);
        expect(noteSection.split('\n\n').length).toBe(1); // Should only include first note due to limit
      }
    });
  });

  describe('getItemWithContent', () => {
    const item = createFakePartial<MergeRequestAIContextItem>({
      id: 'gid://gitlab/MergeRequest/1234',
      category: 'merge_request',
      metadata: createFakePartial<MergeRequestMetadata>({
        subType: 'merge_request',
        subTypeLabel: 'Merge request',
      }),
    });

    it('returns item as-is if content already exists', async () => {
      const itemWithContent = { ...item, content: 'existing content' };
      const result = await mergeRequestProvider.getItemWithContent(itemWithContent);

      expect(result).toBe(itemWithContent);
      expect(mockMergeRequestService.getMergeRequestDetails).not.toHaveBeenCalled();
    });

    it('returns item without content when fetch fails', async () => {
      jest
        .mocked(mockMergeRequestService.getMergeRequestDetails)
        .mockRejectedValue(new Error('Failed to get MR'));

      const result = await mergeRequestProvider.getItemWithContent(item);

      expect(result).toBe(item);
      expect(result.content).toBeUndefined();
    });

    describe('content formatting', () => {
      it('calls formatIssuableHeader with correct parameters', async () => {
        jest
          .mocked(mockMergeRequestService.getMergeRequestDetails)
          .mockResolvedValue(mockMergeRequestDetails);

        const result = await mergeRequestProvider.getItemWithContent(item);

        expect(formatIssuableHeader).toHaveBeenCalledWith(mockMergeRequestDetails, 'Merge request');

        expect(result.content).toContain('formatted header');
      });

      it('formats commit diffs correctly', async () => {
        jest.mocked(getAdvancedContextContentLimit).mockReturnValue(1000);
        const mockMRWithDiffs = createFakePartial<MergeRequestDetails>({
          ...mockMergeRequestDetails,
          commits: {
            nodes: [
              {
                diffs: [
                  {
                    oldPath: 'old/file.ts',
                    newPath: 'new/file.ts',
                    diff: '@@ -1,3 +1,3 @@\n-old line\n+new line\nunchanged',
                  },
                  {
                    oldPath: 'another/file.ts',
                    newPath: 'another/file.ts',
                    diff: '@@ -1 +1 @@\n-removed\n+added',
                  },
                ],
              },
            ],
          },
        });

        jest
          .mocked(mockMergeRequestService.getMergeRequestDetails)
          .mockResolvedValue(mockMRWithDiffs);

        const result = await mergeRequestProvider.getItemWithContent(item);

        expect(result.content).toContain('--- old/file.ts');
        expect(result.content).toContain('+++ new/file.ts');
        expect(result.content).toContain('-old line');
        expect(result.content).toContain('+new line');
        expect(result.content).toContain('unchanged');

        expect(result.content).toContain('--- another/file.ts');
        expect(result.content).toContain('+++ another/file.ts');
        expect(result.content).toContain('-removed');
        expect(result.content).toContain('+added');

        // Verify git diff headers were stripped
        expect(result.content).not.toContain('@@ -1,3 +1,3 @@');
        expect(result.content).not.toContain('@@ -1 +1 @@');
      });

      it('calls formatIssuableNotes with correct parameters', async () => {
        jest
          .mocked(mockMergeRequestService.getMergeRequestDetails)
          .mockResolvedValue(mockMergeRequestDetails);

        const result = await mergeRequestProvider.getItemWithContent(item);

        expect(formatIssuableNotes).toHaveBeenCalledWith(
          mockMergeRequestDetails.discussions.nodes.flatMap((d) => d.notes.nodes),
          expect.any(Number),
        );

        expect(result.content).toContain('formatted note');
      });
    });
  });
});

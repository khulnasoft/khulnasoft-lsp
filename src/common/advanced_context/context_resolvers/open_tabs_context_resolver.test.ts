import * as lruCacheModule from '../../open_tabs/lru_cache';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { IDocContext } from '../../document_transformer_service';
import { OpenTabsResolver } from './open_tabs_context_resolver';

jest.mock('../../open_tabs/lru_cache');

describe('OpenTabsResolver', () => {
  let openTabsResolver: OpenTabsResolver;
  let mockDocContext: IDocContext;

  beforeEach(() => {
    openTabsResolver = new OpenTabsResolver();
    mockDocContext = createFakePartial<IDocContext>({});
  });

  describe('buildContext', () => {
    it('should yield resolutions based on the most recent files', async () => {
      const mockFiles = [
        { uri: 'file1.txt', prefix: 'prefix1', suffix: 'suffix1', fileRelativePath: 'file1.txt' },
        { uri: 'file2.txt', prefix: 'prefix2', suffix: 'suffix2', fileRelativePath: 'file2.txt' },
      ];
      jest.mocked(lruCacheModule).OpenTabsLruCache.getInstance.mockReturnValueOnce(
        createFakePartial<lruCacheModule.OpenTabsLruCache>({
          mostRecentFiles: jest.fn().mockReturnValueOnce(mockFiles),
        }),
      );

      const resolutions = [];
      for await (const resolution of openTabsResolver.buildContext({
        documentContext: mockDocContext,
      })) {
        resolutions.push(resolution);
      }

      expect(resolutions).toEqual([
        {
          category: 'file',
          id: 'file1.txt',
          content: 'prefix1suffix1',
          metadata: {
            enabled: true,
            icon: 'file',
            iid: 'file1.txt',
            languageId: undefined,
            project: undefined,
            relativePath: 'file1.txt',
            secondaryText: 'file1.txt',
            subType: 'open_tab',
            subTypeLabel: 'Open Tab',
            title: 'file1.txt',
            workspaceFolder: undefined,
          },
        },
        {
          category: 'file',
          id: 'file2.txt',
          content: 'prefix2suffix2',
          metadata: {
            enabled: true,
            icon: 'file',
            iid: 'file2.txt',
            languageId: undefined,
            project: undefined,
            relativePath: 'file2.txt',
            secondaryText: 'file2.txt',
            subType: 'open_tab',
            subTypeLabel: 'Open Tab',
            title: 'file2.txt',
            workspaceFolder: undefined,
          },
        },
      ]);
    });

    it('should pass the documentContext and includeCurrentFile flag to mostRecentFiles', async () => {
      const mostRecentFilesMock = jest.fn().mockReturnValueOnce([]);
      jest.mocked(lruCacheModule).OpenTabsLruCache.getInstance.mockReturnValueOnce(
        createFakePartial<lruCacheModule.OpenTabsLruCache>({
          mostRecentFiles: mostRecentFilesMock,
        }),
      );

      for await (const _ of openTabsResolver.buildContext({ documentContext: mockDocContext })) {
        // eslint-disable-next-line no-unused-expressions
        _;
      }

      expect(mostRecentFilesMock).toHaveBeenCalledWith({
        context: mockDocContext,
        includeCurrentFile: false,
      });
    });
  });

  describe('getInstance', () => {
    it('should return a singleton instance of OpenTabsResolver', () => {
      const resolver1 = OpenTabsResolver.getInstance();
      const resolver2 = OpenTabsResolver.getInstance();

      expect(resolver1).toBe(resolver2);
      expect(resolver1).toBeInstanceOf(OpenTabsResolver);
    });
  });
});

import { Tree } from 'web-tree-sitter';
import { LRUCache } from 'lru-cache';
import { IDocContext } from '../../../document_transformer_service';
import { OpenTabsService } from '../../../open_tabs/open_tabs_service';
import type { DuoFeatureAccessService } from '../../../services/duo_access/duo_feature_access_service';
import {
  DefaultDuoProjectAccessChecker,
  DuoProjectStatus,
} from '../../../services/duo_access/project_access_checker';
import { DuoProject } from '../../../services/duo_access/workspace_project_access_cache';
import { createFakePartial } from '../../../test_utils/create_fake_partial';
import { isBinaryContent } from '../../../utils/binary_content';
import { AbstractAIContextProvider } from '../../ai_context_provider';
import { FilePolicyProvider } from '../../context_policies/file_policy';
import { BINARY_FILE_DISABLED_REASON } from '../../context_transformers/ai_context_binary_file_transformer';
import { ANOTHER_OPEN_TAB_FILE, OPEN_TAB_FILE } from '../../test_utils/mock_data';
import { OpenTabsLruCache } from '../../../open_tabs/lru_cache';
import { DefaultOpenTabContextProvider, OpenTabContextProvider } from './open_tabs_provider';

jest.mock('../../../utils/binary_content', () => ({
  isBinaryContent: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../services/duo_access/project_access_checker');
jest.mock('../../../open_tabs/lru_cache');

describe('OpenTabContextProvider', () => {
  let provider: OpenTabContextProvider;
  let mockFilePolicyProvider: FilePolicyProvider;
  let mockDuoFeatureAccessService: DuoFeatureAccessService;
  let mockOpenTabsService: OpenTabsService;
  const document = {
    fileRelativePath: 'fileRelativePath',
    languageId: 'languageId',
    position: {
      line: 1,
      character: 1,
    },
    prefix: 'prefix',
    suffix: 'suffix',
    workspaceFolder: {
      name: 'workspaceFolder',
      uri: 'workspaceFolderUri',
    },
  };
  const openFilesGetMock = jest.fn().mockImplementation((uri) => ({
    ...document,
    uri,
  }));

  const mostRecentFilesMock = jest.fn().mockReturnValue([
    {
      ...document,
      uri: 'uri',
    },
  ]);

  beforeEach(() => {
    const duoProjectAccessChecker = createFakePartial<DefaultDuoProjectAccessChecker>({
      checkProjectStatus: jest.fn().mockReturnValue({
        status: DuoProjectStatus.DuoEnabled,
        project: createFakePartial<DuoProject>({
          projectPath: 'projectPath',
          enabled: true,
          host: 'host',
          namespace: 'namespace',
          namespaceWithPath: 'namespaceWithPath',
          uri: 'uri',
        }),
      }),
    });

    mockFilePolicyProvider = createFakePartial<FilePolicyProvider>({
      isContextItemAllowed: jest.fn().mockReturnValue(true),
    });
    mockDuoFeatureAccessService = createFakePartial<DuoFeatureAccessService>({
      isFeatureEnabled: jest.fn(),
    });

    mockOpenTabsService = createFakePartial<OpenTabsService>({
      getOpenTabCache: jest.fn().mockReturnValue(
        createFakePartial<OpenTabsLruCache>({
          mostRecentFiles: mostRecentFilesMock,
          openFiles: createFakePartial<LRUCache<string, IDocContext>>({
            get: openFilesGetMock,
          }),
        }),
      ),
    });

    provider = new DefaultOpenTabContextProvider(
      duoProjectAccessChecker,
      mockFilePolicyProvider,
      mockDuoFeatureAccessService,
      mockOpenTabsService,
    );
  });

  it('correctly creates a provider instance with the `text` type', () => {
    expect(provider).toBeInstanceOf(DefaultOpenTabContextProvider);
    expect(provider).toBeInstanceOf(AbstractAIContextProvider);
    expect(provider.type).toBe('open_tab');
  });

  it('checks whether context item is allowed by policies when being added', async () => {
    expect(mockFilePolicyProvider.isContextItemAllowed).not.toHaveBeenCalled();
    await provider.addSelectedContextItem(OPEN_TAB_FILE);
    expect(mockFilePolicyProvider.isContextItemAllowed).toHaveBeenCalledWith(
      OPEN_TAB_FILE.metadata.relativePath,
    );
  });

  describe('searchContextItems', () => {
    it.each([
      ['binary content', true, false],
      ['text content', false, true],
    ])('correctly handles %s', async (_, isBinary, shouldBeEnabled) => {
      jest.mocked(isBinaryContent).mockReturnValueOnce(isBinary);

      const results = await provider.searchContextItems({
        query: '',
        category: 'file',
        workspaceFolders: [],
      });

      expect(results[0].metadata.enabled).toBe(shouldBeEnabled);
      expect(isBinaryContent).toHaveBeenCalledWith(expect.stringContaining('prefixsuffix'));
    });

    it('combines multiple disabled reasons', async () => {
      jest.mocked(isBinaryContent).mockReturnValueOnce(true);
      mockFilePolicyProvider.isContextItemAllowed = jest.fn().mockResolvedValue({
        enabled: false,
        disabledReasons: ['policy disabled'],
      });

      const results = await provider.searchContextItems({
        query: '',
        category: 'file',
        workspaceFolders: [],
      });

      expect(results[0].metadata.enabled).toBe(false);
      expect(results[0].metadata.disabledReasons).toEqual(
        expect.arrayContaining([BINARY_FILE_DISABLED_REASON, 'policy disabled']),
      );
    });
  });

  describe('getContextForDocument', () => {
    const documentContext = createFakePartial<IDocContext>({
      fileRelativePath: 'fileRelativePath',
      languageId: 'languageId',
      position: {
        line: 1,
        character: 1,
      },
      prefix: 'prefix',
      suffix: 'suffix',
      uri: 'uri',
      workspaceFolder: {
        name: 'workspaceFolder',
        uri: 'workspaceFolderUri',
      },
    });

    it('should return the most recent files in the workspace excluding the current file', async () => {
      const result = await provider.getContextForCodeSuggestions({
        featureType: 'code_suggestions',
        iDocContext: documentContext,
        tree: createFakePartial<Tree>({}),
      });
      expect(result).toEqual([
        {
          content: 'prefixsuffix',
          category: 'file',
          id: 'uri',
          metadata: {
            disabledReasons: [],
            enabled: true,
            icon: 'document',
            languageId: 'languageId',
            project: 'namespaceWithPath',
            relativePath: 'fileRelativePath',
            secondaryText: 'fileRelativePath',
            subType: 'open_tab',
            subTypeLabel: 'Project file',
            title: 'uri',
            workspaceFolder: {
              name: 'workspaceFolder',
              uri: 'workspaceFolderUri',
            },
          },
        },
      ]);
      expect(mostRecentFilesMock.mock.calls[0][0]).toEqual({
        context: documentContext,
        includeCurrentFile: false,
      });
    });
  });

  describe('retrieveSelectedContextItemsWithContent', () => {
    it('correctly returns Context Item with `content` populated for one item', async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      expect(await provider.retrieveSelectedContextItemsWithContent()).toEqual([
        {
          ...OPEN_TAB_FILE,
          content: 'prefixsuffix',
        },
      ]);
    });
    it('correctly returns multiple Context Items with `content` populated', async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      await provider.addSelectedContextItem(ANOTHER_OPEN_TAB_FILE);
      expect(await provider.retrieveSelectedContextItemsWithContent()).toEqual([
        {
          ...OPEN_TAB_FILE,
          content: 'prefixsuffix',
        },
        {
          ...ANOTHER_OPEN_TAB_FILE,
          content: 'prefixsuffix',
        },
      ]);
    });
  });

  describe('getItemWithContent', () => {
    it('should return item with content', async () => {
      const item = OPEN_TAB_FILE;
      await provider.addSelectedContextItem(item);

      const result = await provider.getItemWithContent(item);

      expect(result).toEqual({
        ...item,
        content: 'prefixsuffix',
      });
    });
  });
});

import { AIContextProviderType, AIContextSearchQuery } from '@khulnasoft/ai-context';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { FeatureFlagService } from '../feature_flags';
import { DefaultConfigService, ConfigService } from '../config_service';
import { IssueContextProvider } from './context_providers/issue';
import type { MergeRequestContextProvider } from './context_providers/merge_request';
import type { AiContextTransformerService } from './context_transformers/ai_context_transformer_service';
import {
  OPEN_TAB_FILE,
  ANOTHER_OPEN_TAB_FILE,
  INVALID_SUBTYPE_ITEM,
  NO_SUBTYPE_ITEM,
  DISABLED_OPEN_TAB_FILE,
  FILE_LOCAL_SEARCH_ITEM,
  DEPENDENCY_ITEM,
  ISSUE_ITEM,
  MERGE_REQUEST_ITEM,
} from './test_utils/mock_data';
import { DefaultOpenTabContextProvider } from './context_providers/open_tabs/open_tabs_provider';
import { DefaultAIContextManager } from './ai_context_manager';
import { LocalFilesContextProvider } from './context_providers/file_local_search';
import { DependencyContextProvider } from './context_providers/dependencies';
import { LocalGitContextProvider } from './context_providers/local_git_context_provider';
import { AIContextProvider } from '.';

describe('AI Context Manager', () => {
  let manager: DefaultAIContextManager;
  let mockContextTransformerService: AiContextTransformerService;
  let configService: ConfigService;

  let mockOpenTabProvider: DefaultOpenTabContextProvider;
  let mockLocalFilesProvider: LocalFilesContextProvider;
  let mockDependencyProvider: DependencyContextProvider;
  let mockIssueContextProvider: IssueContextProvider;
  let mockMergeRequestProvider: MergeRequestContextProvider;
  let mockLocalGitProvider: LocalGitContextProvider;

  const createMockProvider = <T extends { type: AIContextProviderType }>(
    type: AIContextProviderType,
  ) =>
    createFakePartial<T>({
      type,
      addSelectedContextItem: jest.fn(),
      removeSelectedContextItem: jest.fn(),
      getSelectedContextItems: jest.fn(),
      searchContextItems: jest.fn(),
      retrieveSelectedContextItemsWithContent: jest.fn(),
      getItemWithContent: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue({ enabled: true }),
    } as unknown as T);

  beforeEach(() => {
    configService = new DefaultConfigService();
    const mockFeatureFlagService = createFakePartial<FeatureFlagService>({
      isInstanceFlagEnabled: jest.fn().mockReturnValue(true),
    });
    mockContextTransformerService = createFakePartial<AiContextTransformerService>({
      transform: jest.fn().mockImplementation((item) => item),
    });
    mockOpenTabProvider = createMockProvider<DefaultOpenTabContextProvider>('open_tab');
    mockLocalFilesProvider = createMockProvider<LocalFilesContextProvider>('local_file_search');
    mockDependencyProvider = createMockProvider<DependencyContextProvider>('dependency');
    mockMergeRequestProvider = createMockProvider<MergeRequestContextProvider>('merge_request');
    mockLocalGitProvider = createMockProvider<LocalGitContextProvider>('local_git');
    mockIssueContextProvider = createMockProvider<IssueContextProvider>('issue');

    manager = new DefaultAIContextManager(
      configService,
      mockFeatureFlagService,
      mockContextTransformerService,
      [
        mockOpenTabProvider,
        mockLocalFilesProvider,
        mockDependencyProvider,
        mockIssueContextProvider,
        mockMergeRequestProvider,
        mockLocalGitProvider,
      ] as AIContextProvider[],
    );
    return manager.getAvailableCategories();
  });

  describe('addSelectedContextItem', () => {
    it('adds the context item to the provider', async () => {
      const response = await manager.addSelectedContextItem(OPEN_TAB_FILE);
      expect(response).toBe(true);
      expect(mockOpenTabProvider.addSelectedContextItem).toHaveBeenCalledWith(OPEN_TAB_FILE);
    });

    it('return false if adding context item fails', () => {
      const error = new Error('Failed to add context item');
      mockOpenTabProvider.addSelectedContextItem = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(manager.addSelectedContextItem(OPEN_TAB_FILE)).resolves.toBe(false);
    });

    it('returns false if adding item to disabled provider', async () => {
      jest.mocked(mockOpenTabProvider.isAvailable).mockResolvedValue({ enabled: false });
      await manager.getAvailableCategories();

      await expect(manager.addSelectedContextItem(OPEN_TAB_FILE)).resolves.toBe(false);
      expect(mockOpenTabProvider.addSelectedContextItem).not.toHaveBeenCalled();
    });

    it.each([INVALID_SUBTYPE_ITEM, NO_SUBTYPE_ITEM])(
      'returns false if no provider found for type',
      (item) => {
        expect(manager.addSelectedContextItem(item)).resolves.toBe(false);
      },
    );
  });

  describe('removeSelectedContextItem', () => {
    it('removes a context item from the provider', async () => {
      const result = await manager.removeSelectedContextItem(OPEN_TAB_FILE);
      expect(result).toBe(true);
      expect(mockOpenTabProvider.removeSelectedContextItem).toHaveBeenCalledWith(OPEN_TAB_FILE.id);
    });

    it('returns false if removing a context item fails', () => {
      const error = new Error('Failed to remove context item');
      mockOpenTabProvider.removeSelectedContextItem = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(manager.removeSelectedContextItem(OPEN_TAB_FILE)).resolves.toBe(false);
    });

    it.each([INVALID_SUBTYPE_ITEM, NO_SUBTYPE_ITEM])(
      'returns false if no provider found for type',
      (item) => {
        expect(manager.removeSelectedContextItem(item)).resolves.toBe(false);
      },
    );
  });

  describe('searchContextItemsForCategory', () => {
    it('calls getContextItems() on the provider', async () => {
      const mockOpenTabsContext = [OPEN_TAB_FILE, ANOTHER_OPEN_TAB_FILE];
      mockOpenTabProvider.searchContextItems = jest.fn().mockResolvedValue(mockOpenTabsContext);
      mockOpenTabProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);

      const mockLocalFilesContext = [FILE_LOCAL_SEARCH_ITEM];
      mockLocalFilesProvider.searchContextItems = jest
        .fn()
        .mockResolvedValue(mockLocalFilesContext);
      mockLocalFilesProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);

      const mockDependenciesContext = [DEPENDENCY_ITEM];
      mockDependencyProvider.searchContextItems = jest
        .fn()
        .mockResolvedValue(mockDependenciesContext);
      mockDependencyProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);

      const mockIssuesContext = [ISSUE_ITEM];
      mockIssueContextProvider.searchContextItems = jest.fn().mockResolvedValue(mockIssuesContext);
      mockIssueContextProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);

      mockMergeRequestProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);

      const result = await manager.searchContextItemsForCategory({
        category: 'file',
        query: 'test',
        workspaceFolders: [],
      });
      expect(result).toEqual([...mockOpenTabsContext, ...mockLocalFilesContext]);
      expect(mockOpenTabProvider.searchContextItems).toHaveBeenCalled();
      expect(mockLocalFilesProvider.searchContextItems).toHaveBeenCalled();

      const depResult = await manager.searchContextItemsForCategory({
        category: 'dependency',
        query: 'test',
        workspaceFolders: [],
      });
      expect(depResult).toEqual([...mockDependenciesContext]);
      expect(mockDependencyProvider.searchContextItems).toHaveBeenCalled();

      const issueResult = await manager.searchContextItemsForCategory({
        category: 'issue',
        query: 'test',
        workspaceFolders: [],
      });
      expect(issueResult).toEqual([...mockIssuesContext]);
      expect(mockIssueContextProvider.searchContextItems).toHaveBeenCalled();
    });

    it('should call providers with "workspaceFolders" from query params or fallback to config value', async () => {
      const query: AIContextSearchQuery = {
        category: 'file',
        query: 'test',
        workspaceFolders: [],
      };

      await manager.searchContextItemsForCategory(query);
      expect(mockOpenTabProvider.searchContextItems).toHaveBeenLastCalledWith(query);

      const workspaceFolders = [
        {
          uri: 'file:///workspace',
          name: 'Test Workspace',
        },
      ];
      configService.set('client.workspaceFolders', workspaceFolders);
      const noWSFQuery: AIContextSearchQuery = {
        category: 'file',
        query: 'test',
      };
      await manager.searchContextItemsForCategory(noWSFQuery);
      expect(mockOpenTabProvider.searchContextItems).toHaveBeenLastCalledWith({
        ...noWSFQuery,
        workspaceFolders,
      });
    });

    it('should filter out already selected items', async () => {
      const mockContext = [OPEN_TAB_FILE, ANOTHER_OPEN_TAB_FILE];
      const selectedItems = [OPEN_TAB_FILE];
      mockOpenTabProvider.searchContextItems = jest.fn().mockResolvedValue(mockContext);
      mockOpenTabProvider.getSelectedContextItems = jest.fn().mockResolvedValue(selectedItems);
      mockLocalFilesProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockLocalFilesProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);
      mockDependencyProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockDependencyProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);
      mockIssueContextProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockIssueContextProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);
      mockMergeRequestProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);

      const result = await manager.searchContextItemsForCategory({
        category: 'file',
        query: 'test',
        workspaceFolders: [],
      });

      expect(result).toEqual([ANOTHER_OPEN_TAB_FILE]);
      expect(mockOpenTabProvider.searchContextItems).toHaveBeenCalled();
      expect(mockOpenTabProvider.getSelectedContextItems).toHaveBeenCalled();
    });

    it('should put disabled items at the end of the list', async () => {
      const mockContext = [OPEN_TAB_FILE, DISABLED_OPEN_TAB_FILE, ANOTHER_OPEN_TAB_FILE];
      mockOpenTabProvider.searchContextItems = jest.fn().mockResolvedValue(mockContext);
      mockOpenTabProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);
      mockLocalFilesProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockDependencyProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockDependencyProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);
      mockIssueContextProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockIssueContextProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);
      mockMergeRequestProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);

      const result = await manager.searchContextItemsForCategory({
        category: 'file',
        query: 'test',
        workspaceFolders: [],
      });

      expect(result).toEqual([OPEN_TAB_FILE, ANOTHER_OPEN_TAB_FILE, DISABLED_OPEN_TAB_FILE]);
      expect(mockOpenTabProvider.searchContextItems).toHaveBeenCalled();
      expect(mockOpenTabProvider.getSelectedContextItems).toHaveBeenCalled();
    });

    it('does not call providers of other categories', async () => {
      mockOpenTabProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockOpenTabProvider.getSelectedContextItems = jest.fn().mockReturnValue([]);
      mockLocalFilesProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockLocalFilesProvider.getSelectedContextItems = jest.fn().mockReturnValue([]);
      mockIssueContextProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockIssueContextProvider.getSelectedContextItems = jest.fn().mockResolvedValue([]);
      mockMergeRequestProvider.searchContextItems = jest.fn().mockResolvedValue([]);
      mockMergeRequestProvider.getSelectedContextItems = jest
        .fn()
        .mockResolvedValue([MERGE_REQUEST_ITEM]);

      await manager.searchContextItemsForCategory({
        category: 'merge_request',
        query: 'test',
        workspaceFolders: [],
      });

      expect(mockOpenTabProvider.searchContextItems).not.toHaveBeenCalled();
      expect(mockLocalFilesProvider.searchContextItems).not.toHaveBeenCalled();
      expect(mockMergeRequestProvider.searchContextItems).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when all providers for category are disabled', async () => {
      jest.mocked(mockOpenTabProvider.isAvailable).mockResolvedValue({ enabled: false });
      jest.mocked(mockLocalFilesProvider.isAvailable).mockResolvedValue({ enabled: false });
      await manager.getAvailableCategories();

      const result = await manager.searchContextItemsForCategory({
        category: 'file',
        query: 'test',
        workspaceFolders: [],
      });

      expect(result).toEqual([]);
      expect(mockOpenTabProvider.searchContextItems).not.toHaveBeenCalled();
      expect(mockLocalFilesProvider.searchContextItems).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableCategories', () => {
    it('returns the correct categories by default', async () => {
      const categories = await manager.getAvailableCategories();

      expect(categories).toEqual([
        'file',
        'file',
        'dependency',
        'issue',
        'merge_request',
        'local_git',
      ]);
    });

    it('excludes categories when the provider is not available', async () => {
      jest.mocked(mockMergeRequestProvider.isAvailable).mockResolvedValue({ enabled: false });

      const categories = await manager.getAvailableCategories();

      expect(categories).toContain('file');
      expect(categories).toContain('dependency');
      expect(categories).toContain('issue');
      expect(categories).toContain('local_git');
      expect(categories).not.toContain('merge_request');
    });
  });

  describe('retrieveSelectedContextItemsWithContent', () => {
    it('calls retrieveSelectedContextItemsWithContent() on all providers', async () => {
      jest
        .mocked(mockOpenTabProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([OPEN_TAB_FILE, ANOTHER_OPEN_TAB_FILE]);
      jest
        .mocked(mockLocalFilesProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([FILE_LOCAL_SEARCH_ITEM]);
      jest
        .mocked(mockDependencyProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([DEPENDENCY_ITEM]);
      jest
        .mocked(mockIssueContextProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([ISSUE_ITEM]);
      jest
        .mocked(mockMergeRequestProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([MERGE_REQUEST_ITEM]);

      const result = await manager.retrieveContextItemsWithContent({
        featureType: 'duo_chat',
      });

      expect(result).toEqual([
        OPEN_TAB_FILE,
        ANOTHER_OPEN_TAB_FILE,
        FILE_LOCAL_SEARCH_ITEM,
        DEPENDENCY_ITEM,
        ISSUE_ITEM,
        MERGE_REQUEST_ITEM,
      ]);
      expect(mockOpenTabProvider.retrieveSelectedContextItemsWithContent).toHaveBeenCalledTimes(1);
      expect(mockLocalFilesProvider.retrieveSelectedContextItemsWithContent).toHaveBeenCalledTimes(
        1,
      );
      expect(mockDependencyProvider.retrieveSelectedContextItemsWithContent).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mockIssueContextProvider.retrieveSelectedContextItemsWithContent,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockMergeRequestProvider.retrieveSelectedContextItemsWithContent,
      ).toHaveBeenCalledTimes(1);
    });

    it('only retrieves from enabled providers', async () => {
      jest
        .mocked(mockOpenTabProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([OPEN_TAB_FILE]);
      jest
        .mocked(mockLocalFilesProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([FILE_LOCAL_SEARCH_ITEM]);

      jest.mocked(mockLocalFilesProvider.isAvailable).mockResolvedValue({ enabled: false });
      await manager.getAvailableCategories();

      const result = await manager.retrieveContextItemsWithContent({ featureType: 'duo_chat' });

      expect(result).toEqual([OPEN_TAB_FILE]);
      expect(mockOpenTabProvider.retrieveSelectedContextItemsWithContent).toHaveBeenCalled();
      expect(mockLocalFilesProvider.retrieveSelectedContextItemsWithContent).not.toHaveBeenCalled();
    });

    it('transforms all items through the transformer service', async () => {
      [
        mockOpenTabProvider,
        mockLocalFilesProvider,
        mockDependencyProvider,
        mockIssueContextProvider,
        mockMergeRequestProvider,
      ].forEach((provider) =>
        jest.mocked(provider.retrieveSelectedContextItemsWithContent).mockResolvedValue([]),
      );

      const item = OPEN_TAB_FILE;
      const transformedItem = { ...item, content: 'transformed' };
      jest
        .mocked(mockOpenTabProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([item]);
      jest.mocked(mockContextTransformerService.transform).mockResolvedValue(transformedItem);

      const result = await manager.retrieveContextItemsWithContent({
        featureType: 'duo_chat',
      });

      expect(mockContextTransformerService.transform).toHaveBeenCalledTimes(1);
      expect(mockContextTransformerService.transform).toHaveBeenCalledWith(item);

      expect(result).toEqual([transformedItem]);
    });

    it('strips content when transformer service throws an error', async () => {
      const item = OPEN_TAB_FILE;
      const error = new Error('Transform failed');
      jest
        .mocked(mockOpenTabProvider.retrieveSelectedContextItemsWithContent)
        .mockResolvedValue([item]);
      jest.mocked(mockContextTransformerService.transform).mockRejectedValue(error);

      const result = await manager.retrieveContextItemsWithContent({
        featureType: 'duo_chat',
      });

      expect(mockContextTransformerService.transform).toHaveBeenCalledWith(item);
      expect(result).toEqual([
        {
          ...item,
          content: undefined,
        },
      ]);
    });
  });

  describe('getItemWithContent', () => {
    it('should call getItemWithContent on the openTab provider', async () => {
      const item = OPEN_TAB_FILE;
      await manager.getItemWithContent(item);

      expect(mockOpenTabProvider.getItemWithContent).toHaveBeenCalledWith(item);
    });

    it('should call getItemWithContent on the localFiles provider', async () => {
      const item = FILE_LOCAL_SEARCH_ITEM;
      await manager.getItemWithContent(item);

      expect(mockLocalFilesProvider.getItemWithContent).toHaveBeenCalledWith(item);
    });

    it('throws an error if provided with an unknown item type', async () => {
      await expect(manager.getItemWithContent(INVALID_SUBTYPE_ITEM)).rejects.toThrow(
        'No provider found for type "invalid:subtype"',
      );
    });

    it('transforms item through the transformer service', async () => {
      const item = OPEN_TAB_FILE;
      const transformedItem = { ...item, content: 'transformed' };
      jest.mocked(mockContextTransformerService.transform).mockResolvedValue(transformedItem);
      jest.mocked(mockOpenTabProvider.getItemWithContent).mockResolvedValue(item);

      const result = await manager.getItemWithContent(item);

      expect(mockContextTransformerService.transform).toHaveBeenCalledTimes(1);
      expect(mockContextTransformerService.transform).toHaveBeenCalledWith(item);

      expect(result).toEqual(transformedItem);
    });

    it('strips content when transformer service throws an error', async () => {
      const item = OPEN_TAB_FILE;
      const error = new Error('Transform failed');
      jest.mocked(mockOpenTabProvider.getItemWithContent).mockResolvedValue(item);
      jest.mocked(mockContextTransformerService.transform).mockRejectedValue(error);

      const result = await manager.getItemWithContent(item);

      expect(mockContextTransformerService.transform).toHaveBeenCalledWith(item);
      expect(result).toEqual({
        ...item,
        content: undefined,
      });
    });
  });

  describe('getProviderForType', () => {
    it('returns the provider for the given type', async () => {
      const provider = await manager.getProviderForType('open_tab');
      expect(provider).toEqual(mockOpenTabProvider);
    });

    it('throws an error if the provider is not found', async () => {
      await expect(manager.getProviderForType('unknown' as AIContextProviderType)).rejects.toThrow(
        'No provider found for type "unknown"',
      );
    });
  });
});

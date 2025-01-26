import path from 'node:path';
import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import fuzzaldrinPlus from 'fuzzaldrin-plus';
import { FsClient } from '../../services/fs/fs';
import { createMockFsClient } from '../../services/fs/fs.test_utils';
import { DefaultRepositoryService } from '../../services/git/repository_service';
import { DuoProjectAccessChecker } from '../../services/duo_access';
import { DuoProjectStatus } from '../../services/duo_access/project_access_checker';
import { RepositoryFile } from '../../services/git/repository';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import type { DuoFeatureAccessService } from '../../services/duo_access/duo_feature_access_service';
import { isBinaryFile } from '../../utils/binary_content';
import { BINARY_FILE_DISABLED_REASON } from '../context_transformers/ai_context_binary_file_transformer';
import { DefaultLocalFileContextProvider, LocalFileAIContextItem } from './file_local_search';

jest.mock('../../services/git/repository_service');
jest.mock('../../services/duo_access');
jest.mock('../../services/fs');
jest.mock('fuzzaldrin-plus');
jest.mock('../../utils/binary_content', () => ({
  isBinaryFile: jest.fn().mockResolvedValue(false),
}));

describe('DefaultLocalsFileContextProvider', () => {
  let provider: DefaultLocalFileContextProvider;
  let mockRepositoryService: DefaultRepositoryService;
  let mockProjectAccessChecker: DuoProjectAccessChecker;
  let mockFsClient: FsClient;
  let mockDuoFeatureAccessService: DuoFeatureAccessService;

  beforeEach(() => {
    jest.useFakeTimers();
    mockRepositoryService = createFakePartial<DefaultRepositoryService>({
      getCurrentFilesForWorkspace: jest.fn(),
    });
    mockProjectAccessChecker = createFakePartial<DuoProjectAccessChecker>({
      checkProjectStatus: jest.fn(),
    });
    mockFsClient = createMockFsClient();
    mockDuoFeatureAccessService = createFakePartial<DuoFeatureAccessService>({
      isFeatureEnabled: jest.fn(),
    });

    provider = new DefaultLocalFileContextProvider(
      mockRepositoryService,
      mockProjectAccessChecker,
      mockFsClient,
      mockDuoFeatureAccessService,
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('searchContextItems', () => {
    const mockWorkspaceFolder: WorkspaceFolder = {
      uri: 'file:///workspace',
      name: 'workspace',
    };

    const mockFiles: RepositoryFile[] = [
      {
        uri: URI.parse('file:///workspace/file1.ts'),
        workspaceFolder: mockWorkspaceFolder,
        isIgnored: false,
        repositoryUri: URI.parse('file:///workspace/file1.ts'),
        dirUri: () => URI.parse('file:///workspace'),
      },
      {
        uri: URI.parse('file:///workspace/file2.ts'),
        workspaceFolder: mockWorkspaceFolder,
        isIgnored: false,
        repositoryUri: URI.parse('file:///workspace/file2.ts'),
        dirUri: () => URI.parse('file:///workspace'),
      },
    ];

    beforeEach(() => {
      jest.mocked(mockRepositoryService.getCurrentFilesForWorkspace).mockReturnValue(mockFiles);
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValue({
        status: DuoProjectStatus.DuoEnabled,
        project: {
          namespaceWithPath: 'group/project',
          host: 'gitlab.com',
          namespace: 'group',
          projectPath: 'project',
          enabled: true,
          uri: 'file:///workspace/file1.ts',
        },
      });
    });

    it('should return an empty array for an empty query', async () => {
      const result = await provider.searchContextItems({
        query: '',
        workspaceFolders: [],
        category: 'file',
      });
      expect(result).toEqual([]);
    });

    it('should return filtered results for a non-empty query', async () => {
      jest.mocked(fuzzaldrinPlus.filter).mockReturnValue(mockFiles.map((file) => file.uri.fsPath));
      const resultPromise = provider.searchContextItems({
        query: 'file',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'file',
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('file:///workspace/file1.ts');
      expect(result[1].id).toBe('file:///workspace/file2.ts');
    });

    it('should handle disabled projects correctly', async () => {
      jest.mocked(fuzzaldrinPlus.filter).mockReturnValue(mockFiles.map((file) => file.uri.fsPath));
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValueOnce({
        status: DuoProjectStatus.DuoDisabled,
        project: {
          namespaceWithPath: 'group/project',
          host: 'gitlab.com',
          namespace: 'group',
          projectPath: 'project',
          enabled: false,
          uri: 'file:///workspace/file1.ts',
        },
      });

      const resultPromise = provider.searchContextItems({
        query: 'file',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'file',
      });

      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result[0].metadata.enabled).toBe(false);
      expect(result[0].metadata.disabledReasons).toEqual(['project disabled']);
    });

    it('should handle non-KhulnaSoft projects correctly', async () => {
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValueOnce({
        status: DuoProjectStatus.NonGitlabProject,
        project: undefined,
      });

      const resultPromise = provider.searchContextItems({
        query: 'file',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'file',
      });

      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result[0].metadata.project).toBe('not a KhulnaSoft project');
    });

    it.each([
      ['binary file', true, false, [BINARY_FILE_DISABLED_REASON]],
      ['text file', false, true, []],
    ])('correctly handles %s', async (_, isBinary, shouldBeEnabled, expectedReasons) => {
      jest.mocked(isBinaryFile).mockResolvedValueOnce(isBinary);

      const resultPromise = provider.searchContextItems({
        query: 'file',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'file',
      });

      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result[0].metadata.enabled).toBe(shouldBeEnabled);
      expect(result[0].metadata.disabledReasons).toEqual(expectedReasons);
      expect(isBinaryFile).toHaveBeenCalledWith(
        expect.objectContaining({ scheme: 'file' }),
        mockFsClient,
      );
    });

    it('combines disabled reasons from multiple sources', async () => {
      jest.mocked(isBinaryFile).mockResolvedValueOnce(true);
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValue({
        status: DuoProjectStatus.DuoDisabled,
      });

      const resultPromise = provider.searchContextItems({
        query: 'file',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'file',
      });

      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result[0].metadata.enabled).toBe(false);
      expect(result[0].metadata.disabledReasons).toEqual(
        expect.arrayContaining([BINARY_FILE_DISABLED_REASON, 'project disabled']),
      );
    });
  });

  describe('retrieveSelectedContextItemsWithContent', () => {
    it('should retrieve content for selected items', async () => {
      const mockItem: LocalFileAIContextItem = {
        id: 'file:///workspace/file1.ts',
        category: 'file',
        metadata: {
          title: 'file1.ts',
          enabled: true,
          icon: 'document',
          secondaryText: 'group/project - file1.ts',
          project: 'group/project',
          subType: 'local_file_search',
          subTypeLabel: 'Project file',
          relativePath: 'file1.ts',
          workspaceFolder: { uri: 'file:///workspace', name: 'workspace' },
        },
      };

      jest.spyOn(provider, 'getSelectedContextItems').mockResolvedValue([mockItem]);
      jest.mocked(mockFsClient.promises.readFile).mockResolvedValue('file content');

      const result = await provider.retrieveSelectedContextItemsWithContent();

      expect(result.length).toBe(1);
      expect(result[0].content).toBe('file content');
      expect(mockFsClient.promises.readFile).toHaveBeenCalledWith(
        `${path.sep}workspace${path.sep}file1.ts`,
      );
    });
  });

  describe('getItemWithContent', () => {
    it('should get the item with content included', async () => {
      const mockItem: LocalFileAIContextItem = {
        id: 'file:///workspace/file1.ts',
        category: 'file',
        metadata: {
          title: 'file1.ts',
          enabled: true,
          icon: 'document',
          secondaryText: 'group/project - file1.ts',
          project: 'group/project',
          subType: 'local_file_search',
          subTypeLabel: 'Project file',
          relativePath: 'file1.ts',
          workspaceFolder: { uri: 'file:///workspace', name: 'workspace' },
        },
      };

      jest.spyOn(provider, 'getSelectedContextItems').mockResolvedValue([mockItem]);
      jest.mocked(mockFsClient.promises.readFile).mockResolvedValue('file content');

      const result = await provider.getItemWithContent(mockItem);

      expect(result).toMatchObject({
        ...mockItem,
        content: 'file content',
      });
    });
  });
});

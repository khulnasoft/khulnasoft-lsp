import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import { LsConnection } from '../../external_interfaces';
import type { DuoFeatureAccessService } from '../../services/duo_access/duo_feature_access_service';
import { RepositoryService } from '../../services/git/repository_service';
import { DuoProjectAccessChecker } from '../../services/duo_access';
import { DuoProjectStatus } from '../../services/duo_access/project_access_checker';
import { Repository } from '../../services/git/repository';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { AiContextEditorRequests } from '..';
import { GIT_CONTEXT_ITEM } from '../test_utils/mock_data';
import { DefaultLocalGitContextProvider, GitContextItem } from './local_git_context_provider';

jest.mock('../../services/git/repository_service');
jest.mock('../../services/duo_access');

describe('DefaultLocalGitContextProvider', () => {
  let provider: DefaultLocalGitContextProvider;
  let mockLsConnection: LsConnection;
  let mockRepositoryService: RepositoryService;
  let mockProjectAccessChecker: DuoProjectAccessChecker;
  let mockWorkspaceFolder: WorkspaceFolder;
  let mockRepository: Repository;
  let mockDuoFeatureAccessService: DuoFeatureAccessService;

  beforeEach(() => {
    mockWorkspaceFolder = {
      uri: 'file:///workspace',
      name: 'workspace',
    };

    mockRepository = createFakePartial<Repository>({
      uri: URI.parse('file:///workspace/project'),
      configFileUri: URI.parse('file:///workspace/project/.git/config'),
      workspaceFolder: mockWorkspaceFolder,
      getMainBranch: jest.fn().mockResolvedValue('main'),
      getCurrentBranch: jest.fn().mockResolvedValue('feature/test'),
      listBranches: jest.fn().mockResolvedValue(['main', 'feature/test']),
      getHeadRef: jest.fn().mockResolvedValue('abc123'),
    });

    mockLsConnection = createFakePartial<LsConnection>({
      sendRequest: jest.fn(),
    });

    mockRepositoryService = createFakePartial<RepositoryService>({
      getRepositoriesForWorkspace: jest.fn(),
      getRepositoryForWorkspace: jest.fn(),
    });

    mockProjectAccessChecker = createFakePartial<DuoProjectAccessChecker>({
      checkProjectStatus: jest.fn(),
    });

    mockDuoFeatureAccessService = createFakePartial<DuoFeatureAccessService>({
      isFeatureEnabled: jest.fn(),
    });

    provider = new DefaultLocalGitContextProvider(
      mockLsConnection,
      mockRepositoryService,
      mockProjectAccessChecker,
      mockDuoFeatureAccessService,
    );
  });

  describe('searchContextItems', () => {
    beforeEach(() => {
      jest
        .mocked(mockRepositoryService.getRepositoriesForWorkspace)
        .mockReturnValue(new Map([[mockRepository.uri.toString(), mockRepository]]));
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValue({
        status: DuoProjectStatus.DuoEnabled,
        project: {
          namespaceWithPath: 'group/project',
          host: 'gitlab.com',
          namespace: 'group',
          projectPath: 'project',
          enabled: true,
          uri: 'file:///workspace/project',
        },
      });
    });

    it('should return all context items when query is empty', async () => {
      jest.mocked(mockRepository.getMainBranch).mockResolvedValue('main');
      jest.mocked(mockRepository.getCurrentBranch).mockResolvedValue('feature/test');
      jest
        .mocked(mockRepository.listBranches)
        .mockResolvedValue(['main', 'feature/test', 'other/branch']);
      const result = await provider.searchContextItems({
        query: '',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'local_git',
      });

      expect(result).toHaveLength(3);
      expect(result[0].metadata.title).toBe('Diff from main');
      expect(result[1].metadata.title).toBe('Diff from HEAD (working state)');
      expect(result[2].metadata.title).toBe('Diff from other/branch');
    });

    it('should filter out main if on main', async () => {
      jest.mocked(mockRepository.getCurrentBranch).mockResolvedValue('main');
      jest
        .mocked(mockRepository.listBranches)
        .mockResolvedValue(['main', 'feature/test', 'other/branch']);
      const result = await provider.searchContextItems({
        query: '',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'local_git',
      });

      expect(result).toHaveLength(3);
      expect(result[0].metadata.title).toBe('Diff from HEAD (working state)');
      expect(result[1].metadata.title).toBe('Diff from feature/test');
      expect(result[2].metadata.title).toBe('Diff from other/branch');
    });

    it('should filter results based on query', async () => {
      jest.mocked(mockRepository.getCurrentBranch).mockResolvedValue('feature/test');
      jest
        .mocked(mockRepository.listBranches)
        .mockResolvedValue(['main', 'feature/test', 'other/branch']);
      const result = await provider.searchContextItems({
        query: 'other',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'local_git',
      });

      expect(result).toHaveLength(1);
      expect(result[0].metadata.title).toBe('Diff from other/branch');
    });

    it('should handle disabled projects', async () => {
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValue({
        status: DuoProjectStatus.DuoDisabled,
        project: {
          namespaceWithPath: 'group/project',
          host: 'gitlab.com',
          namespace: 'group',
          projectPath: 'project',
          enabled: false,
          uri: 'file:///workspace/project',
        },
      });

      const result = await provider.searchContextItems({
        query: '',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'local_git',
      });

      expect(result[0].metadata.enabled).toBe(false);
      expect(result[0].metadata.disabledReasons).toEqual(['Project disabled']);
    });

    it('should skip test repositories', async () => {
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValue({
        status: DuoProjectStatus.DuoEnabled,
        project: {
          namespaceWithPath: 'gitlab-org/gitlab-test',
          host: 'gitlab.com',
          namespace: 'gitlab-org',
          projectPath: 'gitlab-test',
          enabled: true,
          uri: 'file:///workspace/project',
        },
      });

      const result = await provider.searchContextItems({
        query: '',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'local_git',
      });

      expect(result).toHaveLength(0);
    });

    it('should handle non-KhulnaSoft projects', async () => {
      jest.mocked(mockProjectAccessChecker.checkProjectStatus).mockReturnValue({
        status: DuoProjectStatus.NonGitlabProject,
        project: undefined,
      });

      const result = await provider.searchContextItems({
        query: '',
        workspaceFolders: [mockWorkspaceFolder],
        category: 'local_git',
      });

      expect(result[0].metadata.repositoryName).toBe('/project');
    });
  });

  describe('getItemWithContent', () => {
    beforeEach(() => {
      jest.mocked(mockRepositoryService.getRepositoryForWorkspace).mockReturnValue(mockRepository);
      jest.mocked(mockLsConnection.sendRequest).mockResolvedValue('mock diff content');
    });

    it('should retrieve diff content for a valid item', async () => {
      const result = await provider.getItemWithContent(GIT_CONTEXT_ITEM);

      expect(result.content).toBe('mock diff content');
      expect(mockLsConnection.sendRequest).toHaveBeenCalledWith(AiContextEditorRequests.GIT_DIFF, {
        repositoryUri: mockRepository.uri.toString(),
        branch: 'main',
      });
    });

    it('should return original item when repository is not found', async () => {
      jest.mocked(mockRepositoryService.getRepositoryForWorkspace).mockReturnValue(undefined);

      const result = await provider.getItemWithContent(GIT_CONTEXT_ITEM);

      expect(result).toBe(GIT_CONTEXT_ITEM);
      expect(result.content).toBeUndefined();
      expect(mockLsConnection.sendRequest).not.toHaveBeenCalled();
    });
  });

  describe('retrieveSelectedContextItemsWithContent', () => {
    it('should retrieve content for all selected items', async () => {
      const mockItems: GitContextItem[] = [GIT_CONTEXT_ITEM];

      jest.spyOn(provider, 'getSelectedContextItems').mockResolvedValue(mockItems);
      jest.mocked(mockRepositoryService.getRepositoryForWorkspace).mockReturnValue(mockRepository);
      jest.mocked(mockLsConnection.sendRequest).mockResolvedValue('mock diff content');

      const result = await provider.retrieveSelectedContextItemsWithContent();

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('mock diff content');
      expect(mockLsConnection.sendRequest).toHaveBeenCalledWith(AiContextEditorRequests.GIT_DIFF, {
        repositoryUri: mockRepository.uri.toString(),
        branch: 'main',
      });
    });
  });
});

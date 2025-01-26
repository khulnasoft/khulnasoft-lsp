import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { DirectoryWalker } from '../fs/dir';
import { KhulnaSoftApiClient } from '../../api';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { createMockFsClient } from '../fs/fs.test_utils';
import { fsPathToUri } from '../fs/utils';
import {
  DefaultDuoWorkspaceProjectAccessCache,
  GqlProjectWithDuoEnabledInfo,
} from './workspace_project_access_cache';

jest.mock('../../api');

describe('DefaultDuoWorkspaceProjectAccessCache', () => {
  const directoryWalker = createFakePartial<DirectoryWalker>({
    findFilesForDirectory: jest.fn(),
  });

  const mockFsClient = createMockFsClient();

  const api = createFakePartial<KhulnaSoftApiClient>({
    fetchFromApi: jest.fn(),
  });

  const sampleGitConfig =
    '[remote "origin"]\n\turl = https://gitlab.com/gitlab-org/gitlab-development-kit.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n';

  describe('updateCache', () => {
    it('should update the cache with duo projects for each workspace folder and emit event', async () => {
      const workspaceFolder1: WorkspaceFolder = {
        uri: 'file:///path/to/workspace1',
        name: 'Workspace 1',
      };
      const workspaceFolder2: WorkspaceFolder = {
        uri: 'file:///path/to/workspace2',
        name: 'Workspace 2',
      };
      const baseUrl = 'https://gitlab.com';

      jest
        .mocked(directoryWalker.findFilesForDirectory)
        .mockResolvedValueOnce([
          fsPathToUri('/path/to/workspace1/project1/.git/config'),
          fsPathToUri('/path/to/workspace1/project2/.git/config'),
        ])
        .mockResolvedValueOnce([fsPathToUri('/path/to/workspace2/project3/.git/config')]);

      jest.mocked(mockFsClient.promises.readFile).mockResolvedValue(sampleGitConfig);

      jest.mocked(api.fetchFromApi).mockResolvedValue({
        project: { duoFeaturesEnabled: true },
      } as { project: GqlProjectWithDuoEnabledInfo });

      const cache = new DefaultDuoWorkspaceProjectAccessCache(directoryWalker, mockFsClient, api);
      const listener = jest.fn();
      cache.onDuoProjectCacheUpdate(listener);

      await cache.updateCache({
        baseUrl,
        workspaceFolders: [workspaceFolder1, workspaceFolder2],
      });

      expect(cache.getProjectsForWorkspaceFolder(workspaceFolder1)).toHaveLength(2);
      expect(cache.getProjectsForWorkspaceFolder(workspaceFolder2)).toHaveLength(1);

      const emittedCache = new Map();
      emittedCache.set(workspaceFolder1.uri, cache.getProjectsForWorkspaceFolder(workspaceFolder1));
      emittedCache.set(workspaceFolder2.uri, cache.getProjectsForWorkspaceFolder(workspaceFolder2));
      expect(listener).toHaveBeenCalledWith(emittedCache);
    });

    it('should have enabled set to false if the project does not have duo features enabled', async () => {
      const workspaceFolder: WorkspaceFolder = {
        uri: 'file:///path/to/workspace',
        name: 'Workspace',
      };
      const baseUrl = 'https://gitlab.com';

      jest
        .mocked(directoryWalker.findFilesForDirectory)
        .mockResolvedValueOnce([fsPathToUri('/path/to/workspace/project1/.git/config')]);

      jest.mocked(mockFsClient.promises.readFile).mockResolvedValue(sampleGitConfig);

      jest.mocked(api.fetchFromApi).mockResolvedValue({
        project: { duoFeaturesEnabled: false },
      } as { project: GqlProjectWithDuoEnabledInfo });

      const cache = new DefaultDuoWorkspaceProjectAccessCache(directoryWalker, mockFsClient, api);

      await cache.updateCache({
        baseUrl,
        workspaceFolders: [workspaceFolder],
      });

      const projects = cache.getProjectsForWorkspaceFolder(workspaceFolder);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        enabled: false,
      });
    });

    it('should handle errors and continue updating the cache', async () => {
      const workspaceFolder: WorkspaceFolder = {
        uri: 'file:///path/to/workspace',
        name: 'Workspace',
      };
      const baseUrl = 'https://gitlab.com';

      jest
        .mocked(directoryWalker.findFilesForDirectory)
        .mockResolvedValueOnce([
          fsPathToUri('/path/to/workspace/project1/.git/config'),
          fsPathToUri('/path/to/workspace/project2/.git/config'),
        ]);

      jest
        .mocked(mockFsClient.promises.readFile)
        .mockRejectedValueOnce(new Error('Read file error'));

      jest.mocked(mockFsClient.promises.readFile).mockResolvedValue(sampleGitConfig);

      jest.mocked(api.fetchFromApi).mockResolvedValue({
        project: { duoFeaturesEnabled: true },
      } as { project: GqlProjectWithDuoEnabledInfo });

      const cache = new DefaultDuoWorkspaceProjectAccessCache(directoryWalker, mockFsClient, api);

      await cache.updateCache({
        baseUrl,
        workspaceFolders: [workspaceFolder],
      });

      expect(cache.getProjectsForWorkspaceFolder(workspaceFolder)).toHaveLength(1);
    });
  });

  describe('getProjectsForWorkspaceFolder', () => {
    it('should return the projects for the given workspace folder', async () => {
      const workspaceFolder: WorkspaceFolder = {
        uri: 'file:///path/to/workspace',
        name: 'Workspace',
      };
      const baseUrl = 'https://gitlab.com';

      jest
        .mocked(directoryWalker.findFilesForDirectory)
        .mockResolvedValueOnce([
          fsPathToUri('/path/to/workspace/project1/.git/config'),
          fsPathToUri('/path/to/workspace/project2/.git/config'),
        ]);

      jest.mocked(mockFsClient.promises.readFile).mockResolvedValue(sampleGitConfig);

      jest.mocked(api.fetchFromApi).mockResolvedValue({
        project: { duoFeaturesEnabled: true },
      } as { project: GqlProjectWithDuoEnabledInfo });

      const cache = new DefaultDuoWorkspaceProjectAccessCache(directoryWalker, mockFsClient, api);

      await cache.updateCache({
        baseUrl,
        workspaceFolders: [workspaceFolder],
      });

      const projects = cache.getProjectsForWorkspaceFolder(workspaceFolder);

      // we expect the projects to match the git config files we provide
      expect(projects).toHaveLength(2);
      expect(projects[0]).toMatchObject({
        projectPath: 'gitlab-development-kit',
        uri: 'file:///path/to/workspace/project1/.git/config',
        enabled: true,
        host: 'gitlab.com',
        namespace: 'gitlab-org',
        namespaceWithPath: 'gitlab-org/gitlab-development-kit',
      });
      expect(projects[1]).toMatchObject({
        projectPath: 'gitlab-development-kit',
        uri: 'file:///path/to/workspace/project2/.git/config',
        enabled: true,
        host: 'gitlab.com',
        namespace: 'gitlab-org',
        namespaceWithPath: 'gitlab-org/gitlab-development-kit',
      });
    });
  });
});

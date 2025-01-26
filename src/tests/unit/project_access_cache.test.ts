import fs from 'fs';
import path from 'path';
import os from 'os';
import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { createMockFsClient } from '../../common/services/fs/fs.test_utils';
import { KhulnaSoftApiClient } from '../../common/api';
import { createFakePartial } from '../../common/test_utils/create_fake_partial';
import { fsPathToUri } from '../../common/services/fs/utils';
import { DesktopDirectoryWalker } from '../../node/services/fs';
import {
  DefaultDuoWorkspaceProjectAccessCache,
  GqlProjectWithDuoEnabledInfo,
} from '../../common/services/duo_access/workspace_project_access_cache';

jest.mock('../../common/api');

describe('DuoWorkspaceProjectAccessCache and DirectoryWalker Integration', () => {
  let tempDir: string;
  let workspaceFolder1: WorkspaceFolder;
  let workspaceFolder2: WorkspaceFolder;
  const baseUrl = 'https://gitlab.com';

  const mockFsClient = createMockFsClient();

  const api = createFakePartial<KhulnaSoftApiClient>({
    fetchFromApi: jest.fn(),
  });

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'duo-project-test-'));

    const workspace1Path = path.join(tempDir, 'workspace1');
    const workspace2Path = path.join(tempDir, 'workspace2');
    fs.mkdirSync(workspace1Path);
    fs.mkdirSync(workspace2Path);

    createProjectStructure(workspace1Path, 'project1');
    createProjectStructure(workspace1Path, 'project2');

    createProjectStructure(workspace2Path, 'project3');

    workspaceFolder1 = {
      uri: fsPathToUri(workspace1Path).toString(),
      name: 'Workspace 1',
    };
    workspaceFolder2 = {
      uri: fsPathToUri(workspace2Path).toString(),
      name: 'Workspace 2',
    };
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should correctly identify and process Duo projects across multiple workspace folders', async () => {
    const directoryWalker = new DesktopDirectoryWalker();
    const cache = new DefaultDuoWorkspaceProjectAccessCache(directoryWalker, mockFsClient, api);

    const sampleGitConfig = `
[remote "origin"]
    url = https://gitlab.com/gitlab-org/project1.git
    fetch = +refs/heads/*:refs/remotes/origin/*
`;

    jest.mocked(mockFsClient.promises.readFile).mockResolvedValue(sampleGitConfig);

    jest
      .mocked(api.fetchFromApi)
      .mockResolvedValueOnce({ project: { duoFeaturesEnabled: true } } as {
        project: GqlProjectWithDuoEnabledInfo;
      })
      .mockResolvedValueOnce({ project: { duoFeaturesEnabled: false } } as {
        project: GqlProjectWithDuoEnabledInfo;
      })
      .mockResolvedValueOnce({ project: { duoFeaturesEnabled: true } } as {
        project: GqlProjectWithDuoEnabledInfo;
      });

    const listener = jest.fn();
    cache.onDuoProjectCacheUpdate(listener);

    await cache.updateCache({
      baseUrl,
      workspaceFolders: [workspaceFolder1, workspaceFolder2],
    });

    const projectsInWorkspace1 = cache.getProjectsForWorkspaceFolder(workspaceFolder1);
    const projectsInWorkspace2 = cache.getProjectsForWorkspaceFolder(workspaceFolder2);

    expect(projectsInWorkspace1).toHaveLength(2);
    expect(projectsInWorkspace2).toHaveLength(1);

    expect(projectsInWorkspace1[0]).toMatchObject({
      projectPath: 'project1',
      uri: expect.stringMatching(/file:\/\/.*?\/workspace\w+\/[^/]+\/\.git\/config/),
      enabled: expect.any(Boolean),
      host: 'gitlab.com',
      namespace: 'gitlab-org',
      namespaceWithPath: 'gitlab-org/project1',
    });

    expect(projectsInWorkspace1[1]).toMatchObject({
      projectPath: 'project1',
      uri: expect.stringMatching(/file:\/\/.*?\/workspace\w+\/[^/]+\/\.git\/config/),
      enabled: expect.any(Boolean),
      host: 'gitlab.com',
      namespace: 'gitlab-org',
      namespaceWithPath: 'gitlab-org/project1',
    });

    expect(projectsInWorkspace2[0]).toMatchObject({
      projectPath: 'project1',
      uri: expect.stringContaining('workspace2/project3/.git/config'),
      enabled: true,
      host: 'gitlab.com',
      namespace: 'gitlab-org',
      namespaceWithPath: 'gitlab-org/project1',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const [[emittedCache]] = listener.mock.calls;
    expect(emittedCache.get(workspaceFolder1.uri)).toHaveLength(2);
    expect(emittedCache.get(workspaceFolder2.uri)).toHaveLength(1);

    expect(api.fetchFromApi).toHaveBeenCalledTimes(3);
    expect(mockFsClient.promises.readFile).toHaveBeenCalledTimes(3);
  });
});

function createProjectStructure(workspacePath: string, projectName: string) {
  const projectPath = path.join(workspacePath, projectName);
  const gitConfigPath = path.join(projectPath, '.git', 'config');
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.dirname(gitConfigPath), { recursive: true });
  fs.writeFileSync(gitConfigPath, '');
}

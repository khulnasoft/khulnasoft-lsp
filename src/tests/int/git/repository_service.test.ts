import assert from 'assert';
import { join } from 'path';
import { unlinkSync, writeFileSync } from 'fs-extra';
import { URI } from 'vscode-uri';
import { FeatureFlagService } from '../../../common/feature_flags';
import { LsFetch } from '../../../common/fetch';
import { DefaultVirtualFileSystemService } from '../../../common/services/fs/virtual_file_system_service';
import { DefaultRepositoryService } from '../../../common/services/git/repository_service';
import { DesktopDirectoryWalker } from '../../../node/services/fs';
import { DesktopFsClient } from '../../../node/services/fs/fs';
import { createFakePartial } from '../../../common/test_utils/create_fake_partial';
import { ConfigService } from '../../../common';
import { LsConnection } from '../../../common/external_interfaces';
import {
  TestRepo,
  assertEventually,
  compareRepoFiles,
  setupTestRepos,
  testLog,
  testingPaths,
} from './git_test_utils';

const fiveMinuteTimeout = 300000;

jest.setTimeout(fiveMinuteTimeout);
const sampleRepos = [
  {
    url: 'https://gitlab.com/gitlab-org/gitlab-development-kit.git',
    dir: testingPaths.gdkDir,
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitlab.git',
    dir: join(testingPaths.gdkDir, 'gitlab'),
  },

  {
    url: 'https://gitlab.com/gitlab-org/gitaly.git',
    dir: join(testingPaths.gdkDir, 'gitaly'),
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitlab-runner.git',
    dir: join(testingPaths.gdkDir, 'gitlab-runner'),
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitlab-shell.git',
    dir: join(testingPaths.gdkDir, 'gitlab-shell'),
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitlab-pages.git',
    dir: join(testingPaths.gdkDir, 'gitlab-pages'),
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitlab-workhorse.git',
    dir: join(testingPaths.gdkDir, 'gitlab-workhorse'),
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitaly-proto.git',
    dir: join(testingPaths.gdkDir, 'gitaly-proto'),
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitlab-vscode-extension.git',
    dir: join(testingPaths.tmpDir, 'gitlab-vscode-extension'),
  },
] as const;

const reposToTest: TestRepo[] = sampleRepos.map((repo) => ({
  ...repo,
  treeFiles: new Set<string>(),
  gitIgnoreTestFiles: [],
}));

const describeIf = process.env.TEST_GIT_INTEGRATION === 'true' ? describe : describe.skip;

describeIf('[GIT] - RepositoryService', () => {
  const workspaceFolder = { uri: URI.file(testingPaths.tmpDir).toString(), name: 'tmp' };

  let desktopDirectoryWalker: DesktopDirectoryWalker;
  let virtualFileSystemService: DefaultVirtualFileSystemService;
  let repositoryService: DefaultRepositoryService;
  let testRepos: TestRepo[];

  beforeAll(async () => {
    testRepos = await setupTestRepos(reposToTest);
  });

  beforeEach(() => {
    desktopDirectoryWalker = new DesktopDirectoryWalker();
    virtualFileSystemService = new DefaultVirtualFileSystemService(
      createFakePartial<LsConnection>({
        client: createFakePartial<LsConnection['client']>({}),
      }),
      desktopDirectoryWalker,
      createFakePartial<ConfigService>({
        get: jest.fn().mockReturnValue({
          'client.workspaceFolders': [workspaceFolder],
        }),
      }),
      createFakePartial<FeatureFlagService>({
        isInstanceFlagEnabled: jest.fn().mockReturnValue(true),
        updateInstanceFeatureFlags: jest.fn().mockReturnValue(Promise.resolve()),
      }),
    );
    const mockLsFetch = createFakePartial<LsFetch>({});

    repositoryService = new DefaultRepositoryService(
      virtualFileSystemService,
      desktopDirectoryWalker,
      new DesktopFsClient(),
      mockLsFetch,
    );
  });

  it('should match git ls-tree output with getCurrentFilesForRepository', async () => {
    await virtualFileSystemService.emitFilesForWorkspace(workspaceFolder);

    await assertEventually({
      assertion: () => {
        const repositories = repositoryService.getRepositoriesForWorkspace(workspaceFolder.uri);
        assert.strictEqual(
          repositories.size,
          testRepos.length,
          `Expected repositories size to be ${testRepos.length}, but got ${repositories.size}`,
        );
      },
    });

    const compareRepoTreeWithService = (
      testRepo: TestRepo,
      expectedMissingSize: number,
      expectedExtraSize: number,
    ) => {
      const failures: string[] = [];
      const serviceFiles = repositoryService.getCurrentFilesForRepository(
        URI.file(testRepo.dir),
        workspaceFolder.uri,
        { excludeGitFolder: true, excludeIgnored: true },
      );

      const comparison = compareRepoFiles(
        testRepo,
        serviceFiles.map((file) => file.uri),
      );
      const failureLog = (
        expectedType: string,
        expected: number,
        actual: number,
        files: string[],
        repoUrl: string,
      ) => {
        return `Expected ${expectedType} ${expected}, but got ${actual},
        files: ${files.join(', ')},
        repo: ${repoUrl},
        dir: ${testRepo.dir}`;
      };
      if (comparison.missingInService.size !== expectedMissingSize) {
        failures.push(
          failureLog(
            'missing in service',
            expectedMissingSize,
            comparison.missingInService.size,
            [...comparison.missingInService],
            testRepo.url,
          ),
        );
      }
      if (comparison.extraInService.size !== expectedExtraSize) {
        failures.push(
          failureLog(
            'extra in service',
            expectedExtraSize,
            comparison.extraInService.size,
            [...comparison.extraInService],
            testRepo.url,
          ),
        );
      }
      return failures;
    };

    await assertEventually({
      assertion: () => {
        for (const testRepo of testRepos) {
          const failures = compareRepoTreeWithService(testRepo, 0, 0);
          assert.strictEqual(failures.length, 0, `Failures detected: ${failures.join(', ')}`);
        }
      },
    });

    // FIXME: This test is flaky on CI.
    if (process.env.TEST_FILE_CHANGES) {
      // create a new file for each repo
      const newRickRollFiles = testRepos.map((testRepo) => {
        // we can assume some-random-file.rickroll is unique enough to not collide with existing files
        const rickRollFilePath = join(testRepo.dir, 'some-random-file.rickroll');
        writeFileSync(rickRollFilePath, 'never gonna let you down');
        testLog.info(`[RepositoryService] Wrote file ${rickRollFilePath}`);
        return { filePath: rickRollFilePath, repo: testRepo };
      });

      // expect the file to be added to the repository's *current* files
      await assertEventually({
        assertion: () => {
          for (const rickRollFilePath of newRickRollFiles) {
            const failures = compareRepoTreeWithService(rickRollFilePath.repo, 0, 1);
            assert.strictEqual(
              failures.length,
              0,
              `Failures detected after file changes: ${failures.join(', ')}`,
            );
          }
        },
      });

      // remove them
      for (const rickRollFilePath of newRickRollFiles) {
        unlinkSync(rickRollFilePath.filePath);
        testLog.info(`[RepositoryService] Removed file ${rickRollFilePath.filePath}`);
      }

      // expect the file to be removed from the repository's *current* files
      await assertEventually({
        assertion: () => {
          for (const rickRollFilePath of newRickRollFiles) {
            const failures = compareRepoTreeWithService(rickRollFilePath.repo, 0, 0);
            assert.strictEqual(
              failures.length,
              0,
              `Failures detected after file changes: ${failures.join(', ')}`,
            );
          }
        },
      });
    }
  });
});

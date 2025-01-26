import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import assert from 'assert';
import { URI } from 'vscode-uri';
import { FileChangeType } from 'vscode-languageserver-protocol';
import { LOG_LEVEL } from '../../common/log_types';
import { createFakePartial } from '../../common/test_utils/create_fake_partial';
import { CustomInitializeParams } from '../../common/core/handlers/initialize_handler';
import { KHULNASOFT_TEST_TOKEN, LspClient } from './lsp_client';
import { testingPaths, setupTestRepos, TestRepo, assertEventually } from './git/git_test_utils';

const fiveMinutes = 5 * 60 * 1000;
jest.setTimeout(fiveMinutes);

describe('DidChangeWatchedFiles', () => {
  let lsClient: LspClient;
  let testRepos: TestRepo[];

  const WORKSPACE_FOLDER_URI = URI.file(testingPaths.tmpDir).toString();

  async function setupLS(featureFlags: Record<string, boolean> = {}): Promise<LspClient> {
    const myLSClient = new LspClient(KHULNASOFT_TEST_TOKEN);
    const initParams = createFakePartial<CustomInitializeParams>({
      initializationOptions: { featureFlagOverrides: featureFlags },
    });
    await myLSClient.sendInitialize(initParams);
    await myLSClient.sendDidChangeConfiguration({
      settings: {
        featureFlagOverrides: featureFlags,
        logLevel: LOG_LEVEL.DEBUG,
        workspaceFolders: [{ name: 'tmp', uri: WORKSPACE_FOLDER_URI }],
      },
    });
    await myLSClient.sendInitialized();
    return myLSClient;
  }

  beforeAll(async () => {
    const reposToTest = [
      {
        url: 'https://gitlab.com/gitlab-org/gitlab-vscode-extension.git',
        dir: join(testingPaths.tmpDir, 'gitlab-vscode-extension'),
        treeFiles: new Set<string>(),
        gitIgnoreTestFiles: [],
      },
    ];

    testRepos = await setupTestRepos(reposToTest);

    lsClient = await setupLS({ duo_additional_context: true });
  });

  afterAll(async () => {
    lsClient.dispose();
  });

  describe('File watching capability', () => {
    it('should register the didChangeWatchedFiles capability', async () => {
      // The registration is handled internally by the LspClient
      // We can verify it by checking if the watchedFiles set is not empty
      await assertEventually({
        assertion: () => {
          assert(lsClient.watchedFiles.size > 0);
        },
        timeout: 10000,
        interval: 1000,
      });
    });

    it('should receive file creation events', async () => {
      const testRepo = testRepos[0];
      const newFilePath = join(testRepo.dir, 'new_test_file.txt');
      const newFileUri = URI.file(newFilePath).toString();

      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      writeFileSync(newFilePath, 'This is a test file');

      await lsClient.sendFakeFileEvent(newFileUri, FileChangeType.Created);

      await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
        `[RepositoryService] File ${newFileUri} added to repository ${URI.file(testRepo.dir).toString()}`,
      );

      unlinkSync(newFilePath);
    });

    it('should receive file deletion events', async () => {
      const testRepo = testRepos[0];
      const fileToDeletePath = join(testRepo.dir, 'file_to_delete.txt');
      const fileToDeleteUri = URI.file(fileToDeletePath).toString();

      writeFileSync(fileToDeletePath, 'This file will be deleted');

      await lsClient.sendFakeFileEvent(fileToDeleteUri, FileChangeType.Created);

      await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
        `[RepositoryService] File ${fileToDeleteUri} added to repository ${URI.file(testRepo.dir).toString()}`,
      );

      unlinkSync(fileToDeletePath);

      await lsClient.sendFakeFileEvent(fileToDeleteUri, FileChangeType.Deleted);

      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
        `[RepositoryService] File ${fileToDeleteUri} removed from repository ${URI.file(testRepo.dir).toString()}`,
      );
    });
  });
});

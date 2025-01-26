import { join } from 'path';
import { URI } from 'vscode-uri';
import { CustomInitializeParams } from '../../common/core/handlers/initialize_handler';
import { LOG_LEVEL } from '../../common/log_types';
import { createFakePartial } from '../../common/test_utils/create_fake_partial';
import { setupTestRepos, testingPaths } from './git/git_test_utils';
import { KHULNASOFT_TEST_TOKEN, LspClient } from './lsp_client';
import { MOCK_FILE_1, MOCK_FILE_2 } from './test_utils';

const fiveMinutes = 5 * 60 * 1000;
jest.setTimeout(fiveMinutes);
describe('Duo Project Access', () => {
  let lsClient: LspClient;

  const WORKSPACE_FOLDER_URI = URI.file(testingPaths.tmpDir).toString();
  const TEST_REPO_DIR = join(testingPaths.tmpDir, 'duo-project-access-test');

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
        token: KHULNASOFT_TEST_TOKEN,
      },
    });
    await myLSClient.sendInitialized();
    return myLSClient;
  }

  beforeAll(async () => {
    const reposToTest = [
      {
        url: 'https://gitlab.com/gitlab-org/editor-extensions/experiments/duo-project-access-test.git',
        dir: TEST_REPO_DIR,
        treeFiles: new Set<string>(),
        gitIgnoreTestFiles: [],
      },
    ];

    await setupTestRepos(reposToTest);

    lsClient = await setupLS({
      advanced_context_resolver: true,
      code_suggestions_context: true,
      duo_additional_context: true,
    });
  });

  afterAll(async () => {
    lsClient.dispose();
  });

  /**
   * Note, this test uses the following project:
   * https://gitlab.com/gitlab-org/editor-extensions/experiments/duo-project-access-test
   * Which has `duoFeaturesEnabled` set to false.
   */
  describe('Duo Project Access Cache', () => {
    it('Should filter out code suggestion completions for disabled projects', async () => {
      const completionUri = URI.file(join(TEST_REPO_DIR, 'app', 'models', 'dogs.rb')).toString();

      await lsClient.sendTextDocumentDidOpen(
        completionUri,
        'ruby',
        MOCK_FILE_1.version,
        'puts "Never gonna give you up!"',
      );

      const openTabUri = URI.file(join(TEST_REPO_DIR, 'app', 'models', 'user.rb')).toString();

      await lsClient.sendTextDocumentDidOpen(
        openTabUri,
        'ruby',
        MOCK_FILE_2.version,
        'puts "Never gonna let you down!"',
      );
      // Wait for the project to be found and GraphQL query to be made
      await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
        'found 1 projects for workspace folder',
        5000,
      );
      // Now we can test the completion and ensure that the context is not enabled
      // for the disabled project
      await lsClient.sendTextDocumentCompletion(completionUri, 0, 0);
      await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
        `duo features are not enabled for ${openTabUri}`,
        5000,
      );
    });
  });
});

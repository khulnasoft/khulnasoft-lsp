import { join } from 'path';
import { mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { URI } from 'vscode-uri';
import { FileChangeType } from 'vscode-languageserver-protocol';
import { LOG_LEVEL } from '../../common/log_types';
import { createFakePartial } from '../../common/test_utils/create_fake_partial';
import { CustomInitializeParams } from '../../common/core/handlers/initialize_handler';
import { KHULNASOFT_TEST_TOKEN, LspClient } from './lsp_client';
import { testingPaths, setupTestRepos, TestRepo } from './git/git_test_utils';

const fiveMinutes = 5 * 60 * 1000;
jest.setTimeout(fiveMinutes);
describe('AIContext - Local File Search', () => {
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
        token: KHULNASOFT_TEST_TOKEN,
      },
    });
    await myLSClient.sendInitialized();
    return myLSClient;
  }

  async function createFile(path: string, content: string): Promise<void> {
    writeFileSync(path, content);
    await lsClient.sendFakeFileEvent(URI.file(path).toString(), FileChangeType.Created);
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
  }

  async function deleteFile(path: string): Promise<void> {
    unlinkSync(path);
    await lsClient.sendFakeFileEvent(URI.file(path).toString(), FileChangeType.Deleted);
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
  }

  beforeAll(async () => {
    const reposToTest = [
      {
        url: 'https://gitlab.com/gitlab-org/gitlab-vscode-extension.git',
        dir: join(testingPaths.tmpDir, 'gitlab-vscode-extension'),
        treeFiles: new Set<string>(),
        gitIgnoreTestFiles: [],
      },
      {
        url: 'https://gitlab.com/gitlab-org/gitlab-development-kit.git',
        dir: testingPaths.gdkDir,
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

  describe('when using duo_additional_context feature flag', () => {
    it('should enable context when feature flag is on', async () => {
      const categories = await lsClient.getAvailableCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('file');
    });

    it('should disable context when feature flag is off', async () => {
      const disabledLS = await setupLS({ duo_additional_context: false });

      const categories = await disabledLS.getAvailableCategories();
      expect(categories.length).toBe(0);

      disabledLS.dispose();
    });
  });

  describe('when searching for local files', () => {
    beforeEach(() => lsClient.getAvailableCategories());

    it('should return matching files when searching', async () => {
      const searchResult = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: '.rb',
        workspaceFolders: [{ name: 'tmp', uri: WORKSPACE_FOLDER_URI }],
      });

      expect(searchResult.length).toBeGreaterThan(0);
    });

    it('should return an empty list for empty query', async () => {
      const searchResult = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: '',
        workspaceFolders: [{ name: 'test', uri: WORKSPACE_FOLDER_URI }],
      });

      expect(searchResult).toEqual([]);
    });

    it('should add and remove selected items', async () => {
      const searchResult = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: '.rb',
        workspaceFolders: [{ name: 'test', uri: WORKSPACE_FOLDER_URI }],
      });

      await lsClient.addSelectedContextItem(searchResult[0]);

      expect(await lsClient.getSelectedContextItems()).toEqual([searchResult[0]]);

      await lsClient.removeSelectedContextItem(searchResult[0]);

      expect(await lsClient.getSelectedContextItems()).toEqual([]);
    });

    it('should retrieve selected items with content', async () => {
      const searchResult = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: '.rb',
        workspaceFolders: [{ name: 'test', uri: WORKSPACE_FOLDER_URI }],
      });

      await lsClient.addSelectedContextItem(searchResult[0]);

      const itemsWithContent = await lsClient.retrieveSelectedContextItemsWithContent();

      expect(itemsWithContent).toHaveLength(1);
      expect(itemsWithContent[0]).toEqual({
        ...searchResult[0],
        content: expect.any(String),
      });
    });

    it('should redact secrets from retrieved file content', async () => {
      const testRepo = testRepos[0];
      const mockFileContentsWithSecrets = `
const credentials_final_v2_REAL_v4_updated = {
  awsAccessKey: "AKIAIOSFODNN7EXAMPLE",
  gcpApiKey: "AIzaSyC93b-y6RBy6cd4rh0L-TbxZEMaRFzONKw",
  gitlabPat: "glpat-X_1xyzabcdef23456789",
};`;

      const filePath = join(testRepo.dir, 'config_with_secrets.js');
      await createFile(filePath, mockFileContentsWithSecrets);

      const searchResult = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: 'config_with_secrets.js',
        workspaceFolders: [{ name: 'test', uri: WORKSPACE_FOLDER_URI }],
      });
      await lsClient.addSelectedContextItem(searchResult[0]);

      const itemsWithContent = await lsClient.retrieveSelectedContextItemsWithContent();
      const itemWithContent = itemsWithContent.find((item) =>
        item.id.includes('config_with_secrets.js'),
      );
      const content = itemWithContent?.content || '';

      expect(content).toContain('awsAccessKey: "********************"');
      expect(content).toContain('gcpApiKey: "***************************************"');
      expect(content).toContain('gitlabPat: "**************************"');
      expect(content).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(content).not.toContain('AIzaSyC93b-y6RBy6cd4rh0L-TbxZEMaRFzONKw');
      expect(content).not.toContain('glpat-X_1xyzabcdef23456789');

      await deleteFile(filePath);
    });

    it('should be able to search a newly created file', async () => {
      const testRepo = testRepos[0];

      await createFile(
        join(testRepo.dir, 'new_file.rb'),
        'puts "Never gonna give you up! Never gonna let you down!"',
      );

      const searchResult = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: 'new_file.rb',
        workspaceFolders: [{ name: 'test', uri: WORKSPACE_FOLDER_URI }],
      });

      expect(searchResult.length).toBeGreaterThan(0);
    });

    it('should be able to search newly created nested file, and handle deletion', async () => {
      const testRepo = testRepos[0];
      const nestedFilePath = join(testRepo.dir, 'app', 'models', 'user1234.rb');
      mkdirSync(join(testRepo.dir, 'app', 'models'), { recursive: true });

      await createFile(nestedFilePath, 'class User; end');

      const searchResult = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: 'user1234.rb',
        workspaceFolders: [{ name: 'test', uri: WORKSPACE_FOLDER_URI }],
      });

      expect(searchResult.length).toBeGreaterThan(0);

      await deleteFile(nestedFilePath);

      const searchResultAfterDeletion = await lsClient.searchContextItemsForCategory({
        category: 'file',
        query: 'user1234.rb',
        workspaceFolders: [{ name: 'test', uri: WORKSPACE_FOLDER_URI }],
      });

      expect(searchResultAfterDeletion).toEqual([]);
    });
  });
});

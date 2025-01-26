import { OpenTabAIContextItem } from '../../common/ai_context_management/context_providers/open_tabs/open_tabs_provider';
import { LOG_LEVEL } from '../../common/log_types';
import { createFakePartial } from '../../common/test_utils/create_fake_partial';
import { CustomInitializeParams } from '../../common/core/handlers/initialize_handler';
import { KHULNASOFT_TEST_TOKEN, LspClient } from './lsp_client';
import { MOCK_FILE_1, MOCK_FILE_2 } from './test_utils';

describe('[AIContextManagement] Open tab context provider', () => {
  let lsClient: LspClient;

  async function setupLS(featureFlags: Record<string, boolean> = {}): Promise<LspClient> {
    const myLSClient = new LspClient(KHULNASOFT_TEST_TOKEN);
    const initParams = createFakePartial<CustomInitializeParams>({
      initializationOptions: { featureFlagOverrides: featureFlags },
    });
    await myLSClient.sendInitialize(initParams);
    await myLSClient.sendDidChangeConfiguration({
      settings: {
        // Open tabs context cache logging is debug level, switch to that so that we can verify behaviour
        logLevel: LOG_LEVEL.DEBUG,
        token: KHULNASOFT_TEST_TOKEN,
      },
    });
    await myLSClient.sendInitialized();
    return myLSClient;
  }

  beforeEach(async () => {
    lsClient = await setupLS({ duo_additional_context: true });
  });

  afterEach(() => lsClient.dispose());

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

      await disabledLS.dispose();
    });
  });

  describe('when querying open tabs', () => {
    let CONTEXT_ITEM_1: OpenTabAIContextItem;
    let CONTEXT_ITEM_2: OpenTabAIContextItem;

    beforeEach(async () => {
      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_1.uri,
        MOCK_FILE_1.languageId,
        MOCK_FILE_1.version,
        MOCK_FILE_1.text,
      );

      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_2.uri,
        MOCK_FILE_2.languageId,
        MOCK_FILE_2.version,
        MOCK_FILE_2.text,
      );

      CONTEXT_ITEM_1 = {
        id: MOCK_FILE_1.uri,
        category: 'file',
        metadata: {
          enabled: true,
          disabledReasons: [],
          title: 'some-file.js',
          project: 'not a KhulnaSoft project',
          relativePath: 'some-file.js',
          languageId: 'javascript',
          workspaceFolder: {
            name: 'test',
            uri: 'file://base/path',
          },
          subType: 'open_tab',
          subTypeLabel: 'Project file',
          secondaryText: 'some-file.js',
          icon: 'document',
        },
      };
      CONTEXT_ITEM_2 = {
        id: MOCK_FILE_2.uri,
        category: 'file',
        metadata: {
          enabled: true,
          disabledReasons: [],
          title: 'some-other-file.js',
          project: 'not a KhulnaSoft project',
          relativePath: 'some-other-file.js',
          languageId: 'javascript',
          workspaceFolder: {
            name: 'test',
            uri: 'file://base/path',
          },
          subType: 'open_tab',
          subTypeLabel: 'Project file',
          secondaryText: 'some-other-file.js',
          icon: 'document',
        },
      };
      return lsClient.getAvailableCategories();
    });

    it('should return the list of open tabs', async () => {
      const categories = await lsClient.getAvailableCategories();

      expect(
        await lsClient.searchContextItemsForCategory({
          category: categories[0],
          query: '',
          workspaceFolders: [],
        }),
      ).toEqual([CONTEXT_ITEM_2, CONTEXT_ITEM_1]);
    });

    it('should add and remove selected items', async () => {
      await lsClient.addSelectedContextItem(CONTEXT_ITEM_1);
      await lsClient.addSelectedContextItem(CONTEXT_ITEM_2);

      expect(await lsClient.getSelectedContextItems()).toEqual([CONTEXT_ITEM_1, CONTEXT_ITEM_2]);

      await lsClient.removeSelectedContextItem(CONTEXT_ITEM_2);

      expect(await lsClient.getSelectedContextItems()).toEqual([CONTEXT_ITEM_1]);
    });

    it('should clear selected items', async () => {
      await lsClient.addSelectedContextItem(CONTEXT_ITEM_1);
      await lsClient.addSelectedContextItem(CONTEXT_ITEM_2);

      expect(await lsClient.getSelectedContextItems()).toEqual([CONTEXT_ITEM_1, CONTEXT_ITEM_2]);

      await lsClient.clearSelectedContextItems();

      expect(await lsClient.getSelectedContextItems()).toEqual([]);
    });
  });
});

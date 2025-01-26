import { LOG_LEVEL } from '../../../common/log_types';
import { createFakePartial } from '../../../common/test_utils/create_fake_partial';
import { CustomInitializeParams } from '../../../common/suggestion/suggestion_service';
import { KHULNASOFT_TEST_TOKEN, LspClient } from '../lsp_client';
import { MOCK_FILE_1, MOCK_FILE_2 } from '../test_utils';
import { _test } from '../../../common/suggestion_client/pre_processors';

const { emptyContentLog, languageNotEnabledLog, byteSizeLimitLog, ByteSizeLimitLogType } = _test;

async function setupLS(featureFlags: Record<string, boolean> = {}): Promise<LspClient> {
  const myLSClient = new LspClient(KHULNASOFT_TEST_TOKEN);
  const initParams = createFakePartial<CustomInitializeParams>({
    initializationOptions: {
      featureFlagOverrides: {
        advanced_context_resolver: true,
        code_suggestions_context: true,
        ...featureFlags,
      },
    },
  });
  await myLSClient.sendInitialize(initParams);
  await myLSClient.sendDidChangeConfiguration({
    settings: {
      // logging we're looking for is debug level
      logLevel: LOG_LEVEL.DEBUG,
      token: KHULNASOFT_TEST_TOKEN,
      openTabsContext: true,
    },
  });
  await myLSClient.sendInitialized();
  return myLSClient;
}

describe('disabled code suggestion context', () => {
  let lsClient: LspClient;
  beforeEach(async () => {
    lsClient = await setupLS({
      advanced_context_resolver: false,
      code_suggestions_context: false,
    });
  });
  afterEach(() => lsClient.dispose());
  it('should not use context when feature flags are off', async () => {
    await lsClient.sendTextDocumentDidOpen(
      MOCK_FILE_1.uri,
      'unsupported-language',
      MOCK_FILE_1.version,
      '   \n\t\n   ',
    );

    await lsClient.sendTextDocumentCompletion(MOCK_FILE_1.uri, 0, 0);

    await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
      'code suggestion context is disabled',
    );
  });
});

describe('Code suggestion context filters', () => {
  let lsClient: LspClient;

  beforeEach(async () => {
    lsClient = await setupLS();
  });

  afterEach(() => lsClient.dispose());

  describe('Empty content filter', () => {
    it('should filter out empty content from multiple open files', async () => {
      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_1.uri,
        MOCK_FILE_1.languageId,
        MOCK_FILE_1.version,
        '   \n\t\n   ', // Only whitespace
      );

      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_2.uri,
        MOCK_FILE_2.languageId,
        MOCK_FILE_2.version,
        'never gonna give you up, never gonna let you down',
      );

      await lsClient.sendDidChangeDocumentInActiveEditor(MOCK_FILE_1.uri);
      await lsClient.sendDidChangeDocumentInActiveEditor(MOCK_FILE_2.uri);

      await lsClient.sendTextDocumentCompletion(MOCK_FILE_2.uri, 0, 0);

      await Promise.all([
        expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
          emptyContentLog({
            resolutionId: MOCK_FILE_1.uri,
          }),
        ),
        expect(lsClient).not.toEventuallyContainChildProcessConsoleOutput(
          emptyContentLog({
            resolutionId: MOCK_FILE_2.uri,
          }),
        ),
      ]);
    });
  });

  describe('Byte size limit filter', () => {
    it('should trim large content while keeping small content intact', async () => {
      const largeContent = 'x'.repeat(1000000);
      const normalSizeContent = 'normal sized content';
      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_1.uri,
        MOCK_FILE_1.languageId,
        MOCK_FILE_1.version,
        largeContent,
      );

      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_2.uri,
        MOCK_FILE_2.languageId,
        MOCK_FILE_2.version,
        normalSizeContent,
      );

      await lsClient.sendDidChangeDocumentInActiveEditor(MOCK_FILE_1.uri);
      await lsClient.sendDidChangeDocumentInActiveEditor(MOCK_FILE_2.uri);

      await lsClient.sendTextDocumentCompletion(MOCK_FILE_2.uri, 0, 0);

      await Promise.all([
        expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
          byteSizeLimitLog(ByteSizeLimitLogType.ResolutionTrimmed, {
            contentSize: 49980,
            byteSizeLimit: 50000,
            resolutionId: MOCK_FILE_1.uri,
          }),
        ),
        expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
          byteSizeLimitLog(ByteSizeLimitLogType.LimitExceeded, {
            byteSizeLimit: 50000,
            resolutionId: MOCK_FILE_1.uri,
          }),
        ),
      ]);
    });
  });

  describe('Supported language filter', () => {
    it('should filter out unsupported languages while keeping supported ones', async () => {
      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_1.uri,
        'unsupported-language',
        MOCK_FILE_1.version,
        'content in unsupported language',
      );

      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_2.uri,
        'javascript',
        MOCK_FILE_2.version,
        'content in supported language',
      );

      await lsClient.sendDidChangeDocumentInActiveEditor(MOCK_FILE_1.uri);
      await lsClient.sendDidChangeDocumentInActiveEditor(MOCK_FILE_2.uri);

      await lsClient.sendTextDocumentCompletion(MOCK_FILE_2.uri, 0, 0);

      await Promise.all([
        expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
          languageNotEnabledLog({
            languageId: 'unsupported-language',
            resolutionId: MOCK_FILE_1.uri,
          }),
        ),
        expect(lsClient).not.toEventuallyContainChildProcessConsoleOutput(
          languageNotEnabledLog({
            languageId: 'javascript',
            resolutionId: MOCK_FILE_2.uri,
          }),
        ),
      ]);
    });
  });

  describe('when closing filtered documents', () => {
    it('should properly handle removal from cache', async () => {
      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_1.uri,
        'unsupported-language',
        MOCK_FILE_1.version,
        'content to be filtered',
      );

      await lsClient.sendTextDocumentCompletion(MOCK_FILE_1.uri, 0, 0);

      await lsClient.sendTextDocumentDidClose(MOCK_FILE_1.uri);

      await Promise.all([
        expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
          `File ${MOCK_FILE_1.uri} was deleted from the LRU cache`,
        ),
        expect(lsClient).not.toEventuallyContainChildProcessConsoleOutput(
          `File ${MOCK_FILE_2.uri} was deleted from the LRU cache`,
        ),
      ]);
    });
  });

  describe('should redact secrets from open tabs', () => {
    it('should redact secrets from open tabs', async () => {
      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_1.uri,
        'javascript',
        MOCK_FILE_1.version,
        'aws-key=AKIALALEMEL33243OKIA',
      );

      await lsClient.sendTextDocumentDidOpen(
        MOCK_FILE_2.uri,
        'javascript',
        MOCK_FILE_2.version,
        'glpat=glpat-deadbeefdeadbeefdead',
      );

      await lsClient.sendTextDocumentCompletion(MOCK_FILE_1.uri, 0, 0);
      await lsClient.sendTextDocumentCompletion(MOCK_FILE_2.uri, 0, 0);

      await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
        'redacting secret in file://base/path/some-file.js',
      );
      await expect(lsClient).toEventuallyContainChildProcessConsoleOutput(
        'redacting secret in file://base/path/some-other-file.js',
      );
    });
  });
});

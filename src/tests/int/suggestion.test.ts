import { LspClient, KHULNASOFT_TEST_TOKEN } from './lsp_client';
import { CompletionItem } from 'vscode-languageserver';

// Backend is flaky, sometimes it takes a few
// tries to get back a valid code completion.
jest.retryTimes(10);

test('get a code suggestion', async () => {
  const lsClient = new LspClient(KHULNASOFT_TEST_TOKEN);

  try {
    const initializeResponse = await lsClient.sendInitialize();
    expect(initializeResponse).not.toBeNull();
    await lsClient.sendDidChangeConfiguration();
    await lsClient.sendInitialized();
    await lsClient.sendTextDocumentDidOpen(
      'file://base/path/foo.cs',
      'csharp',
      0,
      'namespace Bar {\n\tpublic class Foo {\n\t}\n}',
    );
    await lsClient.sendTextDocumentDidChangeFull(
      'file://base/path/foo.cs',
      1,
      'namespace Bar {\n\tpublic class Foo {\n\t\tpublic Foo() {\n\t\t\t\n\t\t}\n\t}\n}',
    );
    const resp = await lsClient.sendTextDocumentCompletion('file://base/path/foo.cs', 2, 16);

    expect(resp).not.toBeNull();
    expect((resp as CompletionItem[]).length).toBeGreaterThanOrEqual(1);
    expect((resp as CompletionItem[])[0].insertText).toBeDefined();
  } finally {
    lsClient.dispose();
  }
});

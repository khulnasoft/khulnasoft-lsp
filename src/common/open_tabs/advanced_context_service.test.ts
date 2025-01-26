import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { Disposable } from 'vscode-languageserver-protocol';
import type { DocumentTransformerService } from '../document_transformer_service';
import { DocumentService, TextDocumentChangeListener } from '../document_service';
import { DefaultConfigService } from '../config_service';
import { TextDocumentChangeListenerType } from '../text_document_change_listener_type';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { LsConnection } from '../external_interfaces';
import { OpenTabsLruCache } from './lru_cache';
import { DefaultOpenTabsService } from './open_tabs_service';

jest.mock('./lru_cache');

describe('OpenTabsService', () => {
  let lruCacheMock: OpenTabsLruCache;
  let mockDocument: TextDocument;

  const mockConnectionOnShutdown = jest.fn().mockImplementation((cb) => cb());
  const mockDocumentServiceOnDocumentChange = jest.fn();
  const mockIsLanguageEnabled = jest.fn();
  const mockGetContext = jest.fn();
  let triggerOnDocumentChange: TextDocumentChangeListener;
  let mockSubscription: Disposable;
  const mockDispose = jest.fn();

  beforeEach(() => {
    lruCacheMock = createFakePartial<OpenTabsLruCache>({
      deleteFile: jest.fn().mockImplementation(() => {}),
      updateFile: jest.fn(),
    });
    jest.mocked(OpenTabsLruCache.getInstance).mockReturnValue(lruCacheMock);

    mockDocument = createFakePartial<TextDocument>({
      uri: 'file:///path/to/file.js',
      languageId: 'javascript',
    });

    mockSubscription = createFakePartial<Disposable>({ dispose: mockDispose });

    const configService = new DefaultConfigService();
    const connection = createFakePartial<LsConnection>({ onShutdown: mockConnectionOnShutdown });
    mockDocumentServiceOnDocumentChange.mockImplementation((_callback) => {
      triggerOnDocumentChange = _callback;
      return mockSubscription;
    });
    const documentService = createFakePartial<DocumentService>({
      onDocumentChange: mockDocumentServiceOnDocumentChange,
    });
    const documentTransformer = createFakePartial<DocumentTransformerService>({
      getContext: mockGetContext,
    });

    // eslint-disable-next-line no-new
    new DefaultOpenTabsService(configService, connection, documentService, documentTransformer);
  });

  describe('when connection shuts down', () => {
    it('should clean up disposables', () => {
      expect(mockConnectionOnShutdown).toHaveBeenCalledTimes(1);
      expect(mockDispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a document is closed', () => {
    it('should delete the item from the cache', async () => {
      mockIsLanguageEnabled.mockReturnValue(false);

      triggerOnDocumentChange(
        { document: mockDocument },
        TextDocumentChangeListenerType.onDidClose,
      );

      expect(lruCacheMock.deleteFile).toHaveBeenCalledWith('file:///path/to/file.js');
    });
  });

  describe.each([
    TextDocumentChangeListenerType.onDidOpen,
    TextDocumentChangeListenerType.onDidChangeContent,
    TextDocumentChangeListenerType.onDidSave,
    TextDocumentChangeListenerType.onDidSetActive,
  ])('when receiving event type "%s"', (handlerType) => {
    describe('when a document context exists', () => {
      beforeEach(() => mockGetContext.mockReturnValue({ uri: mockDocument.uri }));

      it('should update the cache', async () => {
        triggerOnDocumentChange({ document: mockDocument }, handlerType);

        expect(lruCacheMock.updateFile).toHaveBeenCalledTimes(1);
        expect(lruCacheMock.updateFile).toHaveBeenCalledWith({ uri: mockDocument.uri });
      });
    });

    describe('when a document context does not exist', () => {
      beforeEach(() => mockGetContext.mockReturnValue(undefined));

      it('should update the cache', async () => {
        triggerOnDocumentChange({ document: mockDocument }, handlerType);

        expect(lruCacheMock.updateFile).not.toHaveBeenCalled();
      });
    });
  });
});

import { WebviewId } from '@khulnasoft/webview-plugin';
import { WebviewLocationService, WebviewUriProvider } from './webview_resource_location_service';

class MockWebviewUriProvider implements WebviewUriProvider {
  constructor(private uri: string) {}

  getUri(): string {
    return this.uri;
  }
}

describe('WebviewLocationService', () => {
  let service: WebviewLocationService;

  const TEST_URI_1 = 'http://example.com';
  const TEST_URI_2 = 'file:///foo/bar';
  const TEST_WEBVIEW_ID: WebviewId = 'webview-1' as WebviewId;

  beforeEach(() => {
    service = new WebviewLocationService();
  });

  describe('resolveUris', () => {
    it('should resolve URIs from multiple providers', () => {
      const provider1 = new MockWebviewUriProvider(TEST_URI_1);
      const provider2 = new MockWebviewUriProvider(TEST_URI_2);

      service.register(provider1);
      service.register(provider2);
      const uris = service.resolveUris(TEST_WEBVIEW_ID);

      expect(uris).toEqual([TEST_URI_1, TEST_URI_2]);
    });

    it('should return an empty array if no providers are registered', () => {
      const uris = service.resolveUris(TEST_WEBVIEW_ID);
      expect(uris).toEqual([]);
    });

    it('should not register the same provider multiple times', () => {
      const provider = new MockWebviewUriProvider(TEST_URI_1);

      service.register(provider);
      service.register(provider);
      const uris = service.resolveUris(TEST_WEBVIEW_ID);

      expect(uris).toEqual([TEST_URI_1]);
    });
  });
});

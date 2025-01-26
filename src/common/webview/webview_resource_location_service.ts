import { WebviewId } from '@khulnasoft/webview-plugin';

type Uri = string;

export interface WebviewUriProvider {
  getUri(webviewId: WebviewId): Uri;
}

export interface WebviewUriProviderRegistry {
  register(provider: WebviewUriProvider): void;
}

export class WebviewLocationService implements WebviewUriProviderRegistry {
  #uriProviders = new Set<WebviewUriProvider>();

  register(provider: WebviewUriProvider) {
    this.#uriProviders.add(provider);
  }

  resolveUris(webviewId: WebviewId): Uri[] {
    const uris: Uri[] = [];
    for (const provider of this.#uriProviders) {
      uris.push(provider.getUri(webviewId));
    }
    return uris;
  }
}

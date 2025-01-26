import { AddressInfo } from 'net';
import { WebviewId } from '@khulnasoft/webview-plugin';
import { WebviewUriProvider } from '../../common/webview';

export class WebviewHttpAccessInfoProvider implements WebviewUriProvider {
  #addressInfo: AddressInfo;

  constructor(address: AddressInfo) {
    this.#addressInfo = address;
  }

  getUri(webviewId: WebviewId): string {
    return `http://${this.#addressInfo.address}:${this.#addressInfo.port}/webview/${webviewId}`;
  }
}

import fetch from 'cross-fetch';
import { createInterfaceId } from '@khulnasoft/di';
import { CancellationToken } from 'vscode-languageserver-protocol';

export interface FetchAgentOptions {
  ignoreCertificateErrors: boolean;
  ca?: string;
  cert?: string;
  certKey?: string;
}

export type FetchHeaders = {
  [key: string]: string;
};

export interface LsFetch {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  fetchBase(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  delete(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  get(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  post(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  put(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  patch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  updateAgentOptions(options: FetchAgentOptions): void;
  streamResponse(
    response: Response,
    cancellationToken: CancellationToken,
  ): AsyncGenerator<string, void, void>;
}

export const LsFetch = createInterfaceId<LsFetch>('LsFetch');

export class FetchBase implements LsFetch {
  updateRequestInit(method: string, init?: RequestInit): RequestInit {
    if (typeof init === 'undefined') {
      // eslint-disable-next-line no-param-reassign
      init = { method };
    } else {
      // eslint-disable-next-line no-param-reassign
      init.method = method;
    }

    return init;
  }

  async initialize(): Promise<void> {}

  async destroy(): Promise<void> {}

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input, init);
  }

  // eslint-disable-next-line require-yield
  async *streamResponse(
    /* eslint-disable @typescript-eslint/no-unused-vars */
    _response: Response,
    _cancellationToken: CancellationToken,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  ): AsyncGenerator<string, void, void> {
    // Stub. Should delegate to the node or browser fetch implementations
    throw new Error('Not implemented');
  }

  async delete(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.fetch(input, this.updateRequestInit('DELETE', init));
  }

  async get(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.fetch(input, this.updateRequestInit('GET', init));
  }

  async post(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.fetch(input, this.updateRequestInit('POST', init));
  }

  async put(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.fetch(input, this.updateRequestInit('PUT', init));
  }

  async patch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.fetch(input, this.updateRequestInit('PATCH', init));
  }

  async fetchBase(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // eslint-disable-next-line no-underscore-dangle, no-restricted-globals
    const _global = typeof global === 'undefined' ? self : global;

    return _global.fetch(input, init);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateAgentOptions(_opts: FetchAgentOptions): void {}
}

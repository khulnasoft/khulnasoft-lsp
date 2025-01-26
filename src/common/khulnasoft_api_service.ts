import { ApiReconfiguredData, ApiRequest, KhulnaSoftApiService } from '@khulnasoft/core';
import { Cable } from '@anycable/core';
import { Injectable } from '@khulnasoft/di';
import { Disposable } from '@khulnasoft/disposable';
import { KhulnaSoftApiClient } from './api';

@Injectable(KhulnaSoftApiService, [KhulnaSoftApiClient])
export class ProxyKhulnaSoftApiService implements KhulnaSoftApiService {
  #client: KhulnaSoftApiClient;

  constructor(client: KhulnaSoftApiClient) {
    this.#client = client;
  }

  fetchFromApi<TReturnType>(request: ApiRequest<TReturnType>): Promise<TReturnType> {
    return this.#client.fetchFromApi(request);
  }

  connectToCable(): Promise<Cable> {
    return this.#client.connectToCable();
  }

  onApiReconfigured(listener: (data: ApiReconfiguredData) => void): Disposable {
    return this.#client.onApiReconfigured(listener);
  }

  get instanceInfo() {
    return this.#client.instanceInfo;
  }

  get tokenInfo() {
    return this.#client.tokenInfo;
  }
}

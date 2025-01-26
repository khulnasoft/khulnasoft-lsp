import { Cable as ActionCableCable } from '@anycable/core';
import { createInterfaceId } from '@khulnasoft/di';
import { Disposable } from '@khulnasoft/disposable';
import { ApiReconfiguredData, ApiRequest, InstanceInfo, TokenInfo } from './types';

export interface KhulnaSoftApiService {
  fetchFromApi<TReturnType>(request: ApiRequest<TReturnType>): Promise<TReturnType>;
  connectToCable(): Promise<ActionCableCable>;
  onApiReconfigured(listener: (data: ApiReconfiguredData) => void): Disposable;
  readonly instanceInfo?: InstanceInfo;
  readonly tokenInfo?: TokenInfo;
}

export const KhulnaSoftApiService = createInterfaceId<KhulnaSoftApiService>('KhulnaSoftApiService');

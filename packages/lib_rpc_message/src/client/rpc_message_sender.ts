import { createInterfaceId } from '@khulnasoft/di';
import { RpcMessageDefinition } from '../types';

export interface RpcMessageSender {
  send<TResponse>(
    messageDefinition: RpcMessageDefinition<undefined, TResponse>,
  ): Promise<TResponse>;
  send<TParams, TResponse>(
    messageDefinition: RpcMessageDefinition<TParams, TResponse>,
    params: TParams,
  ): Promise<TResponse>;
}

export const RpcMessageSender = createInterfaceId<RpcMessageSender>('RpcMessageSender');

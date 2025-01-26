import { RpcNotificationDefinition, RpcRequestDefinition } from '../types';

export const createRpcNotificationDefinition = <TParams>(
  config: Omit<RpcNotificationDefinition<TParams>, 'type'>,
): RpcNotificationDefinition<TParams> => {
  return {
    type: 'notification' as const,
    ...config,
  };
};

export const createRpcRequestDefinition = <TParams, TResponse>(
  config: Omit<RpcRequestDefinition<TParams, TResponse>, 'type'>,
): RpcRequestDefinition<TParams, TResponse> => {
  return {
    type: 'request' as const,
    ...config,
  };
};

import { RpcMessageDefinition } from '@khulnasoft/rpc-message';

export const createTestMessage = (methodName: string): RpcMessageDefinition =>
  ({
    methodName,
  }) as RpcMessageDefinition;

export const createTestMessages = (methodNames: string[]): RpcMessageDefinition[] =>
  methodNames.map(createTestMessage);

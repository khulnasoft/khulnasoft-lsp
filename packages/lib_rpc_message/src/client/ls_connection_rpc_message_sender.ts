import { Connection } from 'vscode-languageserver';
import { RpcMessageDefinition } from '../types';
import { RpcMessageSender } from './rpc_message_sender';
import { RpcValidationError } from './errors';

export class LsConnectionRpcMessageSender implements RpcMessageSender {
  #connection: Connection;

  constructor(connection: Connection) {
    this.#connection = connection;
  }

  send = async <TParams, TResponse>(
    message: RpcMessageDefinition<TParams, TResponse>,
    params?: TParams,
  ): Promise<TResponse> => {
    if (message.paramsSchema && params !== undefined) {
      const paramsParseResult = message.paramsSchema.safeParse(params);
      if (!paramsParseResult.success) {
        throw new RpcValidationError(
          `Validation failed for params in method ${message.methodName}`,
          paramsParseResult.error.message,
        );
      }
    }

    if (message.type === 'notification') {
      await this.#connection.sendNotification(message.methodName, params);
      return undefined as TResponse;
    }

    if (message.type === 'request') {
      const result = await this.#connection.sendRequest(message.methodName, params);
      if (message.responseSchema) {
        const parsedResult = message.responseSchema.safeParse(result);
        if (!parsedResult.success) {
          throw new RpcValidationError(
            `Validation failed for response in method ${message.methodName}`,
            parsedResult.error.message,
          );
        }

        return parsedResult.data;
      }
    }

    throw new Error(`Unknown message type ${message.type}`);
  };
}

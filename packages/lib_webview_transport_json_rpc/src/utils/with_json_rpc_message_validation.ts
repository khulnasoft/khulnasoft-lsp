import { Logger } from '@khulnasoft/logging';
import { MessageValidator } from '@khulnasoft/webview-transport';

export function withJsonRpcMessageValidation<T>(
  validator: MessageValidator<T>,
  logger: Logger | undefined,
  action: (message: T) => void,
): (message: unknown) => void {
  return (message: unknown) => {
    if (!validator(message)) {
      logger?.error(`Invalid JSON-RPC message: ${JSON.stringify(message)}`);
      return;
    }

    action(message);
  };
}

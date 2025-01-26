import { createInterfaceId } from '@khulnasoft/di';
import { MessageBus } from '@khulnasoft/message-bus';
import { MessageMap, WebviewId } from '@khulnasoft/webview-plugin';

export interface ExtensionMessageBusProvider {
  getMessageBus<T extends MessageMap>(webviewId: WebviewId): MessageBus<T>;
}

export const ExtensionMessageBusProvider = createInterfaceId<ExtensionMessageBusProvider>(
  'ExtensionMessageBusProvider',
);

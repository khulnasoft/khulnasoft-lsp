import { MessageBus, MessageMap } from '@khulnasoft/message-bus';

export interface MessageBusProvider {
  name: string;
  getMessageBus<TMessages extends MessageMap>(webviewId: string): MessageBus<TMessages> | null;
}

import { MessageBus, MessageMap } from '@khulnasoft/message-bus';

export interface HostConfig<WebviewMessageMap extends MessageMap = MessageMap> {
  host: MessageBus<WebviewMessageMap>;
}

import { HashedRegistry } from '@khulnasoft/handler-registry';
import { WebviewId } from '@khulnasoft/webview-plugin';

export type ExtensionMessageHandlerKey = {
  pluginId: WebviewId;
  type: string;
};

export class ExtensionMessageHandlerRegistry extends HashedRegistry<ExtensionMessageHandlerKey> {
  constructor() {
    super((key) => `${key.pluginId}:${key.type}`);
  }
}

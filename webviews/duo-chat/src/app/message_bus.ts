import { resolveMessageBus } from '@khulnasoft/webview-client';
import { DUO_CHAT_WEBVIEW_ID, DuoChatWebviewMessages } from '../../metadata';

export const messageBus = resolveMessageBus<DuoChatWebviewMessages>({
  webviewId: DUO_CHAT_WEBVIEW_ID,
});

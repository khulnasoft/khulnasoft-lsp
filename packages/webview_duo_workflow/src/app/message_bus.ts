import { resolveMessageBus } from '@khulnasoft/webview-client';
import { DuoWorkflowMessages, WEBVIEW_ID } from '../contract';

export const messageBus = resolveMessageBus<{
  inbound: DuoWorkflowMessages['pluginToWebview'];
  outbound: DuoWorkflowMessages['webviewToPlugin'];
}>({
  webviewId: WEBVIEW_ID,
});

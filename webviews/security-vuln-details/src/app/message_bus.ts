import { resolveMessageBus } from '@khulnasoft/webview-client';
import { VULN_DETAILS_WEBVIEW_ID, VulnerabilityDetailsWebviewMessages } from '../../metadata';

export const messageBus = resolveMessageBus<VulnerabilityDetailsWebviewMessages>({
  webviewId: VULN_DETAILS_WEBVIEW_ID,
});

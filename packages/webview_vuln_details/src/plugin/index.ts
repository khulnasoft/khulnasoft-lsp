import { WebviewPlugin, CreatePluginMessageMap } from '@khulnasoft/webview-plugin';
import {
  Vulnerability,
  VulnerabilityDetailsWebviewMessages,
} from '@webview/security-vuln-details/metadata';
import { Connection } from 'vscode-languageserver';
import { WEBVIEW_ID, WEBVIEW_TITLE } from '../contract';

type Messages = CreatePluginMessageMap<{
  pluginToWebview: VulnerabilityDetailsWebviewMessages['inbound'];
  webviewToPlugin: VulnerabilityDetailsWebviewMessages['outbound'];
  extensionToPlugin: {
    notifications: {
      updateDetails: {
        vulnerability: Vulnerability;
        filePath: string;
        timestamp: string;
      };
    };
  };
  pluginToExtension: {
    notifications: {
      openLink: {
        href: string;
      };
    };
  };
}>;
export const remoteSecurityWebviewPlugin = (connection: Connection): WebviewPlugin<Messages> => ({
  id: WEBVIEW_ID,
  title: WEBVIEW_TITLE,
  setup: ({ webview, extension }) => {
    extension.onNotification('updateDetails', (message) => {
      webview.onInstanceConnected((_webviewInstanceId, messageBus) => {
        messageBus.sendNotification('updateDetails', {
          vulnerability: message.vulnerability,
          filePath: message.filePath,
          timestamp: message.timestamp,
        });
      });
    });

    webview.onInstanceConnected((_webviewInstanceId, messageBus) => {
      messageBus.onNotification('openLink', async (message) => {
        await connection.sendNotification('$/gitlab/openUrl', { url: message.href });
      });
    });
  },
});

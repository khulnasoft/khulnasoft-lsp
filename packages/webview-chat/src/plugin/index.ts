import { WebviewPlugin, CreatePluginMessageMap } from '@khulnasoft/webview-plugin';
import { WEBVIEW_ID, WEBVIEW_TITLE } from '../constants';

type ChatMessages = CreatePluginMessageMap<{
  webviewToPlugin: {
    notifications: {
      newUserPrompt: {
        prompt: string;
      };
    };
  };
  pluginToWebview: {
    notifications: {
      newUserPrompt: {
        prompt: string;
      };
    };
  };
}>;

export const chatWebviewPlugin: WebviewPlugin<ChatMessages> = {
  id: WEBVIEW_ID,
  title: WEBVIEW_TITLE,
  setup: ({ webview }) => {
    webview.onInstanceConnected((_webviewInstanceId, messageBus) => {
      messageBus.sendNotification('newUserPrompt', {
        prompt: 'This is a new prompt',
      });
    });
  },
};

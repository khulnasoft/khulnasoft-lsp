import { CreatePluginMessageMap } from '@khulnasoft/webview-plugin';
import { DUO_CHAT_V2_WEBVIEW_ID, DuoChatWebviewMessages } from '@webview/duo-chat-v2';
import { ActiveFileContext } from './plugin/port/chat/gitlab_chat_record_context';
import { PromptType } from './plugin/port/chat/client_prompt';

export const WEBVIEW_ID = DUO_CHAT_V2_WEBVIEW_ID;
export const WEBVIEW_TITLE = 'KhulnaSoft Duo Chat';

export type Messages = CreatePluginMessageMap<{
  pluginToWebview: DuoChatWebviewMessages['inbound'];
  webviewToPlugin: DuoChatWebviewMessages['outbound'];
  extensionToPlugin: {
    notifications: {
      newPrompt: {
        prompt: PromptType;
        fileContext: ActiveFileContext;
      };
    };
  };
  pluginToExtension: {
    notifications: {
      showMessage: {
        type: 'error' | 'warning' | 'info';
        message: string;
      };
      insertCodeSnippet: {
        snippet: string;
      };
    };
    requests: {
      getCurrentFileContext: {
        params: undefined;
        result: ActiveFileContext;
      };
    };
  };
}>;

import { CreatePluginMessageMap } from '@khulnasoft/webview-plugin';
import { DUO_CHAT_WEBVIEW_ID, DuoChatWebviewMessages } from '@webview/duo-chat';

export const WEBVIEW_ID = DUO_CHAT_WEBVIEW_ID;
export const WEBVIEW_TITLE = 'KhulnaSoft Duo Chat';

export interface GitlabChatSlashCommand {
  name: string;
  description: string;
  shouldSubmit?: boolean;
}

export interface WebViewInitialStateInterface {
  slashCommands: GitlabChatSlashCommand[];
}

export type KhulnaSoftChatFileContext = {
  fileName: string;
  selectedText: string;
  contentAboveCursor: string | null;
  contentBelowCursor: string | null;
};

export type Messages = CreatePluginMessageMap<{
  pluginToWebview: DuoChatWebviewMessages['inbound'];
  webviewToPlugin: DuoChatWebviewMessages['outbound'];
  extensionToPlugin: {
    notifications: {
      newPrompt: {
        prompt: string;
        fileContext: KhulnaSoftChatFileContext;
      };
    };
  };
  pluginToExtension: {
    notifications: {
      showErrorMessage: {
        message: string;
      };
    };
    requests: {
      getCurrentFileContext: {
        params: undefined;
        result: KhulnaSoftChatFileContext;
      };
    };
  };
}>;

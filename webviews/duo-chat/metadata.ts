import { WebviewId } from '@khulnasoft/webview-plugin';
import { CreateMessageMap } from '@khulnasoft/message-bus';

export type DuoChatWebviewMessages = CreateMessageMap<{
  inbound: {
    notifications: {
      newRecord: { id: string };
      updateRecord: { id: string };
      setLoadingState: boolean;
      cleanChat: undefined;
    };
  };
  outbound: {
    notifications: {
      onReady: undefined;
      cleanChat: undefined;
      newPrompt: {
        record: {
          content: string;
        };
      };
      trackFeedback: {
        data?: {
          extendedTextFeedback: string | null;
          feedbackChoices: Array<string> | null;
        };
      };
    };
  };
}>;

export const DUO_CHAT_WEBVIEW_ID = 'duo-chat' as WebviewId;

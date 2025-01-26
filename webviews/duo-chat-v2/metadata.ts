import { WebviewId } from '@khulnasoft/webview-plugin';
import { CreateMessageMap } from '@khulnasoft/message-bus';
import { AIContextCategory, AIContextItem } from '@khulnasoft/ai-context';
import { GitlabChatSlashCommand } from '@khulnasoft/webview-duo-chat-v2/src/plugin/port/chat/gitlab_chat_slash_commands';

export type DuoChatWebviewMessages = CreateMessageMap<{
  inbound: {
    notifications: {
      clearChat: undefined;
      newRecord: { record: { id: string } };
      updateRecord: { record: { id: string } };
      cancelPrompt: { canceledPromptRequestIds: string[] };
      focusChat: undefined;
      contextCategoriesResult: {
        categories: AIContextCategory[];
      };
      contextCurrentItemsResult: {
        items: AIContextItem[];
      };
      contextItemSearchResult: {
        results: AIContextItem[];
        errorMessage?: string;
      };
      setInitialState: {
        slashCommands: GitlabChatSlashCommand[];
      };
    };
  };
  outbound: {
    notifications: {
      appReady: undefined;
      newPrompt: {
        record: {
          content: string;
        };
      };
      trackFeedback: {
        data?: {
          improveWhat: string | null;
          didWhat: string | null;
          feedbackChoices: string[] | null;
        };
      };
      clearChat: {
        record: {
          content: string;
        };
      };
      insertCodeSnippet: {
        data?: {
          snippet: string | null;
        };
      };
      cancelPrompt: {
        canceledPromptRequestId: string;
      };
      contextItemSearchQuery: {
        query: {
          query: string;
          category: AIContextCategory;
        };
      };
      contextItemAdded: {
        item: AIContextItem;
      };
      contextItemRemoved: {
        item: AIContextItem;
      };
      contextItemGetContent: {
        item: AIContextItem;
        messageId?: string;
      };
    };
  };
}>;

export const DUO_CHAT_V2_WEBVIEW_ID = 'duo-chat-v2' as WebviewId;

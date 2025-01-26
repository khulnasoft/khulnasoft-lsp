import { WebviewPlugin } from '@khulnasoft/webview-plugin';
import { Logger } from '@khulnasoft/logging';
import { KhulnaSoftApiService, UserService } from '@khulnasoft/core';
import { AIContextManager } from '@khulnasoft/ai-context';
import { Messages, WEBVIEW_ID, WEBVIEW_TITLE } from '../contract';
import { KhulnaSoftChatController } from './chat_controller';

type DuoChatPluginFactoryParams = {
  gitlabApiClient: KhulnaSoftApiService;
  userService: UserService;
  logger: Logger;
  aiContextManager: AIContextManager;
};

// FIXME: Replace plugin factory with registration of the Plugin class in DI
// https://github.com/khulnasoft/khulnasoft-lsp/-/issues/653
export const duoChatPluginFactory = ({
  gitlabApiClient,
  userService,
  logger,
  aiContextManager,
}: DuoChatPluginFactoryParams): WebviewPlugin<Messages> => ({
  id: WEBVIEW_ID,
  title: WEBVIEW_TITLE,
  setup: ({ webview, extension }) => {
    webview.onInstanceConnected((_, webviewMessageBus) => {
      const controller = new KhulnaSoftChatController(
        gitlabApiClient,
        webviewMessageBus,
        extension,
        logger,
        userService,
        aiContextManager,
      );

      const newPromptSubscription = extension.onNotification(
        'newPrompt',
        async ({ prompt, fileContext }) => {
          await controller.handleExtensionPrompt(prompt, fileContext);
        },
      );

      return {
        dispose: () => {
          controller.dispose();
          newPromptSubscription.dispose();
        },
      };
    });
  },
});

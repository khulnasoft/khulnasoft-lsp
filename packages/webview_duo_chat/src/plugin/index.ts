import { WebviewPlugin } from '@khulnasoft/webview-plugin';
import { Logger } from '@khulnasoft/logging';
import { Messages, WEBVIEW_ID, WEBVIEW_TITLE } from '../contract';
import { KhulnaSoftApiClient } from './types';
import { KhulnaSoftChatController } from './chat_controller';
import { ChatPlatformManager } from './chat_platform_manager';
import { KhulnaSoftPlatformManagerForChat } from './port/chat/get_platform_manager_for_chat';

type DuoChatPluginFactoryParams = {
  gitlabApiClient: KhulnaSoftApiClient;
  logger: Logger;
};

export const duoChatPluginFactory = ({
  gitlabApiClient,
  logger,
}: DuoChatPluginFactoryParams): WebviewPlugin<Messages> => ({
  id: WEBVIEW_ID,
  title: WEBVIEW_TITLE,
  setup: ({ webview, extension }) => {
    const platformManager = new ChatPlatformManager(gitlabApiClient);
    const gitlabPlatformManagerForChat = new KhulnaSoftPlatformManagerForChat(platformManager);

    webview.onInstanceConnected((_, webviewMessageBus) => {
      const controller = new KhulnaSoftChatController(
        gitlabPlatformManagerForChat,
        webviewMessageBus,
        extension,
        logger,
      );

      const newPromptSubscription = extension.onNotification(
        'newPrompt',
        async ({ prompt, fileContext }) => {
          await controller.prompt(prompt, fileContext);
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

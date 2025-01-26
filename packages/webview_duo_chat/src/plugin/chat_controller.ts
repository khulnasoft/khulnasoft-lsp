import { CompositeDisposable, Disposable } from '@khulnasoft/disposable';
import { Logger } from '@khulnasoft/logging';
import { KhulnaSoftChatFileContext } from '../contract';
import { KhulnaSoftPlatformManagerForChat } from './port/chat/get_platform_manager_for_chat';
import { KhulnaSoftChatApi } from './port/chat/gitlab_chat_api';
import { KhulnaSoftChatRecord } from './port/chat/gitlab_chat_record';
import { DuoChatExtensionMessageBus, DuoChatWebviewMessageBus } from './types';
import { AiCompletionResponseMessageType } from './port/api/graphql/ai_completion_response_channel';

export class KhulnaSoftChatController implements Disposable {
  readonly chatHistory: KhulnaSoftChatRecord[];

  readonly #api: KhulnaSoftChatApi;

  readonly #extensionMessageBus: DuoChatExtensionMessageBus;

  readonly #webviewMessageBus: DuoChatWebviewMessageBus;

  readonly #subscriptions = new CompositeDisposable();

  readonly #logger: Logger;

  constructor(
    manager: KhulnaSoftPlatformManagerForChat,
    webviewMessageBus: DuoChatWebviewMessageBus,
    extensionMessageBus: DuoChatExtensionMessageBus,
    logger: Logger,
  ) {
    this.#api = new KhulnaSoftChatApi(manager);
    this.chatHistory = [];
    this.#webviewMessageBus = webviewMessageBus;
    this.#extensionMessageBus = extensionMessageBus;
    this.#logger = logger;

    this.#setupMessageHandlers.bind(this)();
  }

  dispose(): void {
    this.#subscriptions.dispose();
  }

  async prompt(message: string, fileContext?: KhulnaSoftChatFileContext) {
    const record = KhulnaSoftChatRecord.buildWithContext({
      role: 'user',
      content: message,
    });

    const resolvedFileContext = fileContext ?? (await this.#getCurrentFileContext());

    if (resolvedFileContext) {
      record.context = {
        ...record.context,
        currentFile: resolvedFileContext,
      };
    }

    await this.#processNewUserRecord(record);
  }

  #setupMessageHandlers() {
    this.#subscriptions.add(
      this.#webviewMessageBus.onNotification('newPrompt', async (message) => {
        const record = KhulnaSoftChatRecord.buildWithContext({
          role: 'user',
          content: message.record.content,
        });

        const fileContext = await this.#getCurrentFileContext();
        if (fileContext) {
          record.context = {
            ...record.context,
            currentFile: fileContext,
          };
        }

        await this.#processNewUserRecord(record);
      }),
    );
  }

  async #getCurrentFileContext(): Promise<KhulnaSoftChatFileContext | undefined> {
    try {
      return await this.#extensionMessageBus.sendRequest('getCurrentFileContext', undefined);
    } catch (error) {
      this.#logger.warn('Failed to get current file context', error as Error);
      return undefined;
    }
  }

  async #processNewUserRecord(record: KhulnaSoftChatRecord) {
    if (!record.content) return;

    await this.#sendNewPrompt(record);

    if (record.errors.length > 0) {
      this.#extensionMessageBus.sendNotification('showErrorMessage', {
        message: record.errors[0],
      });

      return;
    }

    await this.#addToChat(record);

    if (record.type === 'newConversation') return;

    const responseRecord = new KhulnaSoftChatRecord({
      role: 'assistant',
      state: 'pending',
      requestId: record.requestId,
    });
    await this.#addToChat(responseRecord);

    try {
      await this.#api.subscribeToUpdates(this.#subscriptionUpdateHandler.bind(this), record.id);
    } catch (err) {
      this.#logger.error('Failed to subscribe to updates', err as Error);
    }
    // Fallback if websocket fails or disabled.
    await Promise.all([this.#refreshRecord(record), this.#refreshRecord(responseRecord)]);
  }

  async #subscriptionUpdateHandler(data: AiCompletionResponseMessageType) {
    const record = this.#findRecord(data);

    if (!record) return;

    record.update({
      chunkId: data.chunkId,
      content: data.content,
      contentHtml: data.contentHtml,
      extras: data.extras,
      timestamp: data.timestamp,
      errors: data.errors,
    });

    record.state = 'ready';
    this.#webviewMessageBus.sendNotification('updateRecord', record);
  }

  // async #restoreHistory() {
  //   this.chatHistory.forEach((record) => {
  //     this.#webviewMessageBus.sendNotification('newRecord', record);
  //   }, this);
  // }

  async #addToChat(record: KhulnaSoftChatRecord) {
    this.chatHistory.push(record);
    this.#webviewMessageBus.sendNotification('newRecord', record);
  }

  async #sendNewPrompt(record: KhulnaSoftChatRecord) {
    if (!record.content) throw new Error('Trying to send prompt without content.');

    try {
      const actionResponse = await this.#api.processNewUserPrompt(
        record.content,
        record.id,
        record.context?.currentFile,
      );
      record.update(actionResponse.aiAction);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        record.update({ errors: [`API error: ${(err as any).response.errors[0].message}`] });
      } else if (err instanceof Error) {
        record.update({ errors: [`Error: ${err.message}`] });
      }
    }
  }

  async #refreshRecord(record: KhulnaSoftChatRecord) {
    if (!record.requestId) {
      throw Error('requestId must be present!');
    }

    const apiResponse = await this.#api.pullAiMessage(record.requestId, record.role);

    if (apiResponse.type !== 'error') {
      record.update({
        content: apiResponse.content,
        contentHtml: apiResponse.contentHtml,
        extras: apiResponse.extras,
        timestamp: apiResponse.timestamp,
      });
    }

    record.update({ errors: apiResponse.errors, state: 'ready' });
    this.#webviewMessageBus.sendNotification('updateRecord', record);
  }

  #findRecord(data: { requestId: string; role: string }) {
    return this.chatHistory.find(
      (r) => r.requestId === data.requestId && r.role.toLowerCase() === data.role.toLowerCase(),
    );
  }
}

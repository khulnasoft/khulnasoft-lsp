import { TestLogger, Logger } from '@khulnasoft/logging';
import { UserService, KhulnaSoftApiService, InstanceInfo } from '@khulnasoft/core';
import { AIContextCategory, AIContextItem, AIContextManager } from '@khulnasoft/ai-context';
import { Messages } from '../contract';
import { AiCompletionResponseMessageType } from './port/api/graphql/ai_completion_response_channel';
import { createFakePartial } from './port/test_utils/create_fake_partial';
import { KhulnaSoftChatController } from './chat_controller';
import { KhulnaSoftChatRecord } from './port/chat/gitlab_chat_record';
import { SubmitFeedbackParams, submitFeedback } from './port/chat/utils/submit_feedback';
import { SPECIAL_MESSAGES } from './port/constants';
import { DuoChatExtensionMessageBus, DuoChatWebviewMessageBus } from './types';
import { KhulnaSoftChatApi } from './port/chat/gitlab_chat_api';
import { ActiveFileContext } from './port/chat/gitlab_chat_record_context';
import { defaultSlashCommands } from './port/chat/gitlab_chat_slash_commands';
import { PromptType } from './port/chat/client_prompt';

jest.useFakeTimers();

jest.mock('./port/chat/gitlab_chat_api');

describe('KhulnaSoftChatController', () => {
  let controller: KhulnaSoftChatController;
  let webviewMessageBus: DuoChatWebviewMessageBus;
  let extensionMessageBus: DuoChatExtensionMessageBus;
  let logger: Logger;
  let apiMock: KhulnaSoftChatApi;
  let aiContextManager: AIContextManager;
  let apiClient: KhulnaSoftApiService;
  type WebviewNotificationHandlers = Record<
    keyof Messages['webviewToPlugin']['notifications'],
    (...args: unknown[]) => void
  >;

  type ExtensionNotificationHandlers = Record<
    keyof Messages['extensionToPlugin']['notifications'],
    (...args: unknown[]) => void
  >;
  const webviewNotificationHandlers = createFakePartial<WebviewNotificationHandlers>({});
  const extensionNotificationHandlers = createFakePartial<ExtensionNotificationHandlers>({});

  beforeEach(() => {
    apiClient = createFakePartial<KhulnaSoftApiService>({
      instanceInfo: createFakePartial<InstanceInfo>({}),
    });
    const userService = createFakePartial<UserService>({
      user: {
        gqlId: 'gid://gitlab/User/12345',
      },
    });

    aiContextManager = createFakePartial<AIContextManager>({
      addSelectedContextItem: jest.fn(),
      removeSelectedContextItem: jest.fn(),
      getAvailableCategories: jest.fn(),
      getSelectedContextItems: jest.fn(),
      searchContextItemsForCategory: jest.fn(),
    });

    apiMock = createFakePartial<KhulnaSoftChatApi>({
      processNewUserPrompt: jest.fn(),
      pullAiMessage: jest.fn(),
      clearChat: jest.fn(),
      subscribeToUpdates: jest.fn(),
    });

    jest.mocked(KhulnaSoftChatApi).mockReturnValue(apiMock);

    webviewMessageBus = createFakePartial<DuoChatWebviewMessageBus>({
      sendNotification: jest.fn(),
      onNotification: jest
        .fn()
        .mockImplementation(
          (type: keyof Messages['webviewToPlugin']['notifications'], callback) => {
            webviewNotificationHandlers[type] = callback;
          },
        ),
    });

    extensionMessageBus = createFakePartial<DuoChatExtensionMessageBus>({
      sendNotification: jest.fn(),
      sendRequest: jest.fn(),
      onNotification: jest
        .fn()
        .mockImplementation(
          (type: keyof Messages['extensionToPlugin']['notifications'], callback) => {
            extensionNotificationHandlers[type] = callback;
          },
        ),
    });
    logger = new TestLogger();

    controller = new KhulnaSoftChatController(
      apiClient,
      webviewMessageBus,
      extensionMessageBus,
      logger,
      userService,
      aiContextManager,
    );

    apiMock.processNewUserPrompt = jest.fn().mockResolvedValue({
      aiAction: {
        errors: [],
        requestId: 'uniqueId',
      },
    });

    apiMock.pullAiMessage = jest.fn().mockImplementation((requestId: string, role: string) => ({
      content: `api response ${role}`,
      role,
      requestId,
      timestamp: '2023-01-01 01:01:01',
      extras: { sources: ['foo'] },
    }));
  });

  describe('restores chat history when webview app is ready', () => {
    it('sends canceled prompts ids to the webview', async () => {
      const canceledPromptRequestIds = ['test-request-id-1', 'test-request-id-2'];
      await webviewNotificationHandlers.cancelPrompt({
        canceledPromptRequestId: canceledPromptRequestIds[0],
      });
      webviewNotificationHandlers.appReady();

      expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith('cancelPrompt', {
        canceledPromptRequestIds: [canceledPromptRequestIds[0]],
      });
    });

    it('calls aiContextManager methods to refresh context categories and current items', async () => {
      jest.mocked(aiContextManager.getAvailableCategories).mockResolvedValue(['file', 'snippet']);
      jest.mocked(aiContextManager.getSelectedContextItems).mockResolvedValue([]);
      await webviewNotificationHandlers.appReady();

      expect(aiContextManager.getAvailableCategories).toHaveBeenCalled();
      expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith('contextCategoriesResult', {
        categories: ['file', 'snippet'],
      });
      expect(aiContextManager.getSelectedContextItems).toHaveBeenCalled();
      expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith('contextCurrentItemsResult', {
        items: [],
      });
    });

    it('restores chat history', async () => {
      jest.mocked(aiContextManager.getSelectedContextItems);
      controller.chatHistory.push(
        new KhulnaSoftChatRecord({ role: 'user', content: 'ping' }),
        new KhulnaSoftChatRecord({ role: 'assistant', content: 'pong' }),
      );

      await webviewNotificationHandlers.appReady();

      expect(webviewMessageBus.sendNotification).toHaveBeenNthCalledWith(3, 'newRecord', {
        record: expect.objectContaining(controller.chatHistory[0]),
      });
      expect(webviewMessageBus.sendNotification).toHaveBeenNthCalledWith(4, 'newRecord', {
        record: expect.objectContaining(controller.chatHistory[1]),
      });
    });

    it('sets initial state of the webview', async () => {
      await webviewNotificationHandlers.appReady();
      expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith('setInitialState', {
        slashCommands: defaultSlashCommands,
      });
    });
  });

  describe('processNewUserRecord', () => {
    let userRecord: KhulnaSoftChatRecord;
    let temporaryAssistantRecord: KhulnaSoftChatRecord;

    beforeEach(() => {
      userRecord = new KhulnaSoftChatRecord({ role: 'user', content: 'hello' });
      temporaryAssistantRecord = new KhulnaSoftChatRecord({
        role: 'assistant',
        state: 'pending',
        requestId: 'uniqueId',
      });
    });

    describe('before the api call', () => {
      beforeEach(() => {
        apiMock.processNewUserPrompt = jest.fn(() => {
          throw new Error('asd');
        });
      });

      // TODO: handle focus state in scope of https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/1681
      xit('shows the view', async () => {
        try {
          await controller.processNewUserRecord(userRecord);
        } catch (e) {
          /* empty */
        }

        // expect(viewMock.show).toHaveBeenCalled();
      });
    });

    it('adds both the user prompt and the temporary assistant record', async () => {
      await controller.processNewUserRecord(userRecord);

      expect(webviewMessageBus.sendNotification).toHaveBeenCalledTimes(2);
      expect(webviewMessageBus.sendNotification).toHaveBeenNthCalledWith(
        1, // 1st call
        'newRecord',
        expect.objectContaining({ record: userRecord }), // Second argument
      );
      // check temporary assistant message
      expect(webviewMessageBus.sendNotification).toHaveBeenNthCalledWith(
        2, // 2st call
        'newRecord',
        expect.objectContaining({
          record: expect.objectContaining({
            requestId: temporaryAssistantRecord.requestId,
            role: temporaryAssistantRecord.role,
            state: temporaryAssistantRecord.state,
          }),
        }),
      );
    });

    describe('with API error on sending the message', () => {
      it('updates message with API error and sends VSCode error notification', async () => {
        apiMock.processNewUserPrompt = jest
          .fn()
          .mockRejectedValue({ response: { errors: [{ message: 'testError' }] } });

        await controller.processNewUserRecord(userRecord);

        expect(userRecord.errors).toStrictEqual([
          'Failed to send the chat message to the API: testError',
        ]);
        expect(extensionMessageBus.sendNotification).toHaveBeenCalledWith('showMessage', {
          type: 'error',
          message: 'Failed to send the chat message to the API: testError',
        });
      });
    });

    it('fills updated history', async () => {
      expect(controller.chatHistory).toEqual([]);

      await controller.processNewUserRecord(userRecord);

      expect(controller.chatHistory[0]).toEqual(userRecord);

      expect(controller.chatHistory[1].role).toEqual(temporaryAssistantRecord.role);
      expect(controller.chatHistory[1].content).toEqual(temporaryAssistantRecord.content);
    });

    it('does not change userRecord timestamp when api returns an error', async () => {
      const timestampBefore = userRecord.timestamp;

      jest.mocked(apiMock.pullAiMessage).mockResolvedValueOnce({
        type: 'error',
        errors: ['timeout'],
        requestId: 'requestId',
        role: 'system',
      });

      await controller.processNewUserRecord(userRecord);

      expect(userRecord.timestamp).toStrictEqual(timestampBefore);
    });

    it('passes active file context to the API', async () => {
      const currentFileContext = {
        fileName: 'foo.rb',
        selectedText: 'selected_text',
        contentAboveCursor: 'before_text',
        contentBelowCursor: 'after_text',
      };

      userRecord.context = { currentFile: currentFileContext };

      await controller.processNewUserRecord(userRecord);

      expect(apiMock.processNewUserPrompt).toHaveBeenCalledWith(
        'hello',
        expect.any(String),
        currentFileContext,
        undefined,
      );
    });

    describe('with newChatConversation command', () => {
      beforeEach(() => {
        userRecord = new KhulnaSoftChatRecord({ role: 'user', content: SPECIAL_MESSAGES.RESET });
      });

      it('sends only new user userRecord and doesnt wait for response', async () => {
        await controller.processNewUserRecord(userRecord);

        expect(webviewMessageBus.sendNotification).toHaveBeenNthCalledWith(
          1,
          'newRecord',
          expect.objectContaining({
            record: expect.objectContaining({
              content: SPECIAL_MESSAGES.RESET,
              state: 'ready',
              role: 'user',
            }),
          }),
        );
        expect(controller.chatHistory[0]).toEqual(
          expect.objectContaining({
            content: SPECIAL_MESSAGES.RESET,
            state: 'ready',
            role: 'user',
            type: 'newConversation',
          }),
        );
        expect(controller.chatHistory.length).toEqual(1);
      });
    });

    it('handles API errors and disconnects cable when action fails', async () => {
      const newUserRecord = new KhulnaSoftChatRecord({ role: 'user', content: 'hello' });
      const mockCable = { disconnect: jest.fn() };
      const mockError = new Error('API error');
      (mockError as unknown as { response: { errors: { message: string }[] } }).response = {
        errors: [{ message: 'Something went wrong' }],
      };

      apiMock.processNewUserPrompt = jest.fn().mockRejectedValue(mockError);
      apiMock.subscribeToUpdates = jest.fn().mockResolvedValue(mockCable);

      await controller.processNewUserRecord(newUserRecord);

      expect(mockCable.disconnect).toHaveBeenCalled();
      expect(newUserRecord.errors).toEqual([
        'Failed to send the chat message to the API: Something went wrong',
      ]);
      expect(extensionMessageBus.sendNotification).toHaveBeenCalledWith(
        'showMessage',
        expect.objectContaining({
          type: 'error',
          message: 'Failed to send the chat message to the API: Something went wrong',
        }),
      );
    });

    it('uses fallback polling when subscription fails', async () => {
      const newUserRecord = new KhulnaSoftChatRecord({ role: 'user', content: 'hello' });
      const subscriptionError = new Error('Subscription failed');

      apiMock.processNewUserPrompt = jest.fn().mockResolvedValue({
        aiAction: {
          errors: [],
          requestId: 'uniqueId',
        },
      });
      apiMock.subscribeToUpdates = jest.fn().mockRejectedValue(subscriptionError);

      await controller.processNewUserRecord(newUserRecord);

      expect(apiMock.pullAiMessage).toHaveBeenCalledTimes(2);
      expect(apiMock.pullAiMessage).toHaveBeenCalledWith('uniqueId', 'user');
      expect(apiMock.pullAiMessage).toHaveBeenCalledWith('uniqueId', 'assistant');
    });
  });

  describe('message updates subscription', () => {
    let userRecord: KhulnaSoftChatRecord;
    let chunk: Partial<AiCompletionResponseMessageType>;
    let subscriptionHandler = () => {};

    beforeEach(async () => {
      userRecord = new KhulnaSoftChatRecord({ role: 'user', content: 'hello' });
      chunk = {
        chunkId: 1,
        content: 'chunk #1',
        role: 'assistant',
        timestamp: 'foo',
        requestId: 'uniqueId',
        errors: [],
      };
      jest.mocked(apiMock.subscribeToUpdates).mockImplementation((messageCallback) => {
        subscriptionHandler = async () => {
          await messageCallback(chunk);
        };
      });
      await controller.processNewUserRecord(userRecord);
    });

    it('subscribes to the message updates', () => {
      expect(apiMock.subscribeToUpdates).toHaveBeenCalled();
    });

    it('updates the existing record', () => {
      chunk = {
        ...chunk,
        requestId: 'uniqueId',
      };

      expect(webviewMessageBus.sendNotification).toHaveBeenCalledTimes(2);
      subscriptionHandler();
      expect(
        jest
          .mocked(webviewMessageBus.sendNotification)
          .mock.calls.filter((call) => call[0] === 'newRecord'),
      ).toHaveLength(2);

      expect(
        jest
          .mocked(webviewMessageBus.sendNotification)
          .mock.calls.filter((call) => call[0] === 'updateRecord'),
      ).toHaveLength(1);

      expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
        'updateRecord',
        expect.objectContaining({
          record: expect.objectContaining({
            chunkId: 1,
            content: 'chunk #1',
            state: 'ready',
            requestId: 'uniqueId',
          }),
        }),
      );
    });

    it('does not update any record if the record does not exist yet', () => {
      chunk = {
        ...chunk,
        requestId: 'non-existingId',
      };

      subscriptionHandler();

      expect(webviewMessageBus.sendNotification).not.toHaveBeenCalledWith('updateRecord');
    });

    it('updates the record with additional context items from the response', async () => {
      const newUserRecord = new KhulnaSoftChatRecord({ role: 'user', content: 'hello' });
      apiMock.processNewUserPrompt = jest.fn().mockResolvedValue({
        aiAction: {
          errors: [],
          requestId: 'uniqueId',
        },
      });

      apiMock.subscribeToUpdates = jest.fn(async (messageCallback) => {
        const data: AiCompletionResponseMessageType = {
          requestId: 'uniqueId',
          role: 'assistant',
          content: 'Response content',
          chunkId: 1,
          timestamp: 'foo',
          errors: [],
          extras: {
            sources: [],
            additionalContext: [
              createFakePartial<AIContextItem>({
                id: '1',
                category: 'file',
                content: 'file content',
                metadata: {},
              }),
            ],
          },
        };
        await messageCallback(data);
        return { cable: { disconnect: jest.fn() } };
      });

      await controller.processNewUserRecord(newUserRecord);
      await jest.runAllTimersAsync();

      expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
        'updateRecord',
        expect.objectContaining({
          record: expect.objectContaining({
            extras: expect.objectContaining({
              contextItems: expect.arrayContaining([
                expect.objectContaining({
                  category: 'file',
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('Webview message handlers', () => {
    describe('newPrompt', () => {
      it('processes new userRecord', async () => {
        controller.processNewUserRecord = jest.fn();

        await webviewNotificationHandlers.newPrompt({
          record: {
            content: 'hello',
          },
        });

        expect(controller.processNewUserRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'hello',
          }),
        );
      });

      it('processes new user record and clears selected context items', async () => {
        const recordContent = 'hello';
        controller.processNewUserRecord = jest.fn();
        aiContextManager.clearSelectedContextItems = jest.fn();

        await webviewNotificationHandlers.newPrompt({
          record: {
            content: recordContent,
          },
        });

        expect(controller.processNewUserRecord).toHaveBeenCalledWith(expect.any(KhulnaSoftChatRecord));
        expect(aiContextManager.clearSelectedContextItems).toHaveBeenCalled();
      });
    });

    describe('cancelPrompt', () => {
      const canceledPromptRequestIds = ['test-request-id-1', 'test-request-id-2'];
      beforeEach(() => {
        controller.processNewUserRecord = jest.fn();
      });

      it('should pass all cancelPrompt IDs to webview when cancelling', async () => {
        await webviewNotificationHandlers.cancelPrompt({
          canceledPromptRequestId: canceledPromptRequestIds[0],
        });

        expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith('cancelPrompt', {
          canceledPromptRequestIds: [canceledPromptRequestIds[0]],
        });

        // jest.mocked(webviewMessageBus.sendNotification).mockClear();
        await webviewNotificationHandlers.cancelPrompt({
          canceledPromptRequestId: canceledPromptRequestIds[1],
        });
        expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith('cancelPrompt', {
          canceledPromptRequestIds,
        });
      });
    });

    describe('clearChat', () => {
      beforeEach(() => {
        jest.mocked(apiMock.clearChat).mockResolvedValue({
          aiAction: {
            errors: [],
            requestId: 'uniqueId',
          },
        });
      });

      it('should process new user record for KhulnaSoft version >= 17.5.0', async () => {
        apiClient.instanceInfo!.instanceVersion = '17.5.0';
        controller.processNewUserRecord = jest.fn();
        aiContextManager.clearSelectedContextItems = jest.fn();

        await webviewNotificationHandlers.clearChat({
          record: {
            content: SPECIAL_MESSAGES.CLEAN,
          },
        });

        expect(controller.processNewUserRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            content: SPECIAL_MESSAGES.CLEAN,
          }),
        );
        expect(controller.processNewUserRecord).toHaveBeenCalledWith(expect.any(KhulnaSoftChatRecord));
        expect(aiContextManager.clearSelectedContextItems).toHaveBeenCalled();
      });

      describe('content is /clear or /clean and version < 17.5.0', () => {
        beforeEach(() => {
          controller.processNewUserRecord = jest.fn();
          apiClient.instanceInfo!.instanceVersion = '17.4.0';
        });

        it('triggers `clearChat` on the API', async () => {
          expect(apiMock.clearChat).not.toHaveBeenCalled();
          await webviewNotificationHandlers.clearChat({
            record: {
              content: SPECIAL_MESSAGES.CLEAR,
            },
          });

          expect(apiMock.clearChat).toHaveBeenCalled();
        });

        it('triggers `clearChat` on the view', async () => {
          await webviewNotificationHandlers.clearChat({
            record: {
              content: SPECIAL_MESSAGES.CLEAR,
            },
          });

          expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith('clearChat');
        });

        it('handles errors in response by showing VSCode error message', async () => {
          expect(extensionMessageBus.sendNotification).not.toHaveBeenCalledWith('showMessage');

          jest.mocked(apiMock.clearChat).mockResolvedValue({
            aiAction: {
              errors: ['foo', 'bar'],
              requestId: 'uniqueId',
            },
          });

          await webviewNotificationHandlers.clearChat({
            record: {
              content: SPECIAL_MESSAGES.CLEAR,
            },
          });
          expect(extensionMessageBus.sendNotification).toHaveBeenCalledWith('showMessage', {
            type: 'error',
            message: 'foo, bar',
          });
        });

        it('handles non-recoverable errors failing the response', async () => {
          expect(extensionMessageBus.sendNotification).not.toHaveBeenCalledWith('showMessage');

          jest.mocked(apiMock.clearChat).mockRejectedValue(new Error('test problem'));

          await webviewNotificationHandlers.clearChat({
            record: {
              content: SPECIAL_MESSAGES.CLEAR,
            },
          });
          expect(extensionMessageBus.sendNotification).toHaveBeenCalledWith('showMessage', {
            type: 'error',
            message: 'Error: test problem',
          });
        });

        it('clears local chatHistory state', async () => {
          controller.chatHistory.push(
            new KhulnaSoftChatRecord({ role: 'user', content: 'ping' }),
            new KhulnaSoftChatRecord({ role: 'assistant', content: 'pong' }),
          );

          await webviewNotificationHandlers.clearChat({
            record: {
              content: SPECIAL_MESSAGES.CLEAR,
            },
          });
          expect(controller.chatHistory).toHaveLength(0);
        });
      });
    });

    describe('contextItemRemoved', () => {
      it('calls aiContextManager.remove and refreshes current context items', async () => {
        const contextItem = createFakePartial<AIContextItem>({
          id: '1',
          category: 'file',
          content: 'content',
          metadata: {
            title: 'title',
            enabled: true,
            subType: 'open_tab',
          },
        });
        aiContextManager.removeSelectedContextItem = jest.fn().mockResolvedValue(true);
        aiContextManager.getSelectedContextItems = jest.fn().mockResolvedValue([]);

        await webviewNotificationHandlers.contextItemRemoved({ item: contextItem });

        expect(aiContextManager.removeSelectedContextItem).toHaveBeenCalledWith(contextItem);
        expect(aiContextManager.getSelectedContextItems).toHaveBeenCalled();
        expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
          `contextCurrentItemsResult`,
          expect.objectContaining({
            items: [],
          }),
        );
      });
    });

    describe('contextItemAdded', () => {
      it('calls aiContextManager.add and refreshes current context items', async () => {
        const contextItem = createFakePartial<AIContextItem>({
          id: '1',
          category: 'file',
          content: 'content',
          metadata: {
            title: 'title',
            enabled: true,
            subType: 'open_tab',
          },
        });
        jest.mocked(aiContextManager.addSelectedContextItem).mockResolvedValue(true);
        jest.mocked(aiContextManager.getSelectedContextItems).mockResolvedValue([contextItem]);

        await webviewNotificationHandlers.contextItemAdded({ item: contextItem });

        expect(aiContextManager.addSelectedContextItem).toHaveBeenCalledWith(contextItem);
        expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
          `contextCurrentItemsResult`,
          expect.objectContaining({
            items: [contextItem],
          }),
        );
      });
    });

    describe('contextItemSearchQuery', () => {
      it('calls aiContextManager.query with correct parameters and updates view with results', async () => {
        const category = 'file' as AIContextCategory;
        const query = 'test query';
        const results: AIContextItem[] = [
          createFakePartial<AIContextItem>({
            id: '1',
            category,
            content: 'result',
            metadata: {
              title: 'title',
              enabled: true,
              subType: 'open_tab',
            },
          }),
        ];
        jest.mocked(aiContextManager.searchContextItemsForCategory).mockResolvedValue(results);

        await webviewNotificationHandlers.contextItemSearchQuery({ query: { category, query } });

        expect(aiContextManager.searchContextItemsForCategory).toHaveBeenCalledWith({
          query,
          category,
        });

        expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
          `contextItemSearchResult`,
          expect.objectContaining({
            results,
          }),
        );
      });
    });

    describe('contextItemGetContent', () => {
      const contextItem = createFakePartial<AIContextItem>({
        id: '1',
        category: 'file',
        content: undefined,
        metadata: {
          title: 'title',
          enabled: true,
          subType: 'open_tab',
        },
      });
      const hydratedContextItem = {
        ...contextItem,
        content: 'water',
      };

      beforeEach(() => {
        aiContextManager.getSelectedContextItems = jest.fn().mockResolvedValue([contextItem]);
        aiContextManager.getItemWithContent = jest.fn().mockResolvedValue(hydratedContextItem);
      });

      it('calls aiContextManager.getContent with correct parameters', async () => {
        await webviewNotificationHandlers.contextItemGetContent({
          item: contextItem,
          messageId: undefined,
        });

        expect(aiContextManager.getItemWithContent).toHaveBeenCalledWith(contextItem);
      });

      describe('when there is no messageId', () => {
        it('updates selected context items in the view with the hydrated context item', async () => {
          await webviewNotificationHandlers.contextItemGetContent({
            item: contextItem,
            messageId: undefined,
          });

          expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
            'contextCurrentItemsResult',
            expect.objectContaining({
              items: [hydratedContextItem],
            }),
          );
        });
      });

      describe('when there is a messageId', () => {
        it('updates expected chat record in the view with the hydrated context item', async () => {
          const userRecord = new KhulnaSoftChatRecord({
            role: 'user',
            content: 'ping',
            extras: {
              sources: [],
              contextItems: [contextItem],
            },
          });
          controller.chatHistory.push(
            userRecord,
            new KhulnaSoftChatRecord({ role: 'assistant', content: 'pong' }),
          );

          await webviewNotificationHandlers.contextItemGetContent({
            item: contextItem,
            messageId: userRecord.id,
          });

          expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
            'newRecord',
            expect.objectContaining({
              record: expect.objectContaining({
                id: userRecord.id,
                extras: expect.objectContaining({
                  contextItems: [hydratedContextItem],
                }),
              }),
            }),
          );
        });
      });
    });

    describe('newPrompt', () => {
      it('should request active file context from the client', async () => {
        const activeFileContext = createFakePartial<ActiveFileContext>({
          fileName: 'foo',
          selectedText: 'bar',
          contentAboveCursor: 'function a (arg1)',
          contentBelowCursor: '{}',
        });

        jest.mocked(extensionMessageBus.sendRequest).mockResolvedValue(activeFileContext);
        await webviewNotificationHandlers.newPrompt({
          record: {
            content: 'explain',
          },
        });
        expect(extensionMessageBus.sendRequest).toHaveBeenCalledWith(
          'getCurrentFileContext',
          undefined,
        );
        expect(webviewMessageBus.sendNotification).toHaveBeenCalledWith(
          'newRecord',
          expect.objectContaining({
            record: expect.objectContaining({
              context: {
                currentFile: activeFileContext,
              },
            }),
          }),
        );
      });
    });

    describe('insertCodeSnippet', () => {
      it('calls insertCodeSnippet when data is present', async () => {
        const snippet = 'const example = "test";';
        await webviewNotificationHandlers.insertCodeSnippet({
          data: {
            snippet,
          },
        });

        expect(extensionMessageBus.sendNotification).toHaveBeenCalledWith('insertCodeSnippet', {
          snippet,
        });
      });

      it('does not call insertCodeSnippet when no data is present', async () => {
        const snippet = '';
        await webviewNotificationHandlers.insertCodeSnippet({
          data: {
            snippet,
          },
        });

        expect(extensionMessageBus.sendNotification).not.toHaveBeenCalled();
      });
    });

    // TODO: fix in scope https://github.com/khulnasoft/khulnasoft-lsp/-/issues/566
    xdescribe('trackFeedback', () => {
      it('calls submitFeedback when data is present', async () => {
        const expected: SubmitFeedbackParams = {
          didWhat: 'didWhat',
          improveWhat: 'improveWhat',
          feedbackChoices: ['choice1', 'choice2'],
          gitlabEnvironment: KhulnaSoftEnvironment.KHULNASOFT_COM,
        };

        await controller.viewMessageHandler({
          eventType: 'trackFeedback',
          data: {
            didWhat: expected.didWhat,
            improveWhat: expected.improveWhat,
            feedbackChoices: expected.feedbackChoices,
          },
        });

        expect(submitFeedback).toHaveBeenCalledWith(expected);
      });

      it('does not call submitFeedback when no data is present', async () => {
        await controller.viewMessageHandler({
          eventType: 'trackFeedback',
        });

        expect(submitFeedback).not.toHaveBeenCalled();
      });
    });
  });

  describe('Extension message handlers', () => {
    describe('handleExtensionPrompt', () => {
      beforeEach(() => {
        controller.processNewUserRecord = jest.fn();
      });

      it('should not process new user record when promptType is not newConversation and fileContext is undefined', async () => {
        await controller.handleExtensionPrompt('explainCode');
        expect(controller.processNewUserRecord).not.toHaveBeenCalled();
      });

      it('should process new user record for newConversation even without fileContext', async () => {
        await controller.handleExtensionPrompt('newConversation');
        expect(controller.processNewUserRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'user',
            content: '/reset',
            type: 'newConversation',
          }),
        );
      });

      it('should process new user record with fileContext for non-newConversation promptTypes', async () => {
        const fileContext = {
          fileName: 'test.ts',
          selectedText: 'const x = 5;',
          contentAboveCursor: 'function test() {',
          contentBelowCursor: '}',
        };
        await controller.handleExtensionPrompt('explainCode', fileContext);
        expect(controller.processNewUserRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'user',
            content: '/explain',
            type: 'explainCode',
            context: { currentFile: fileContext },
          }),
        );
      });

      it('should use the correct command content for each promptType', async () => {
        const fileContext = createFakePartial<ActiveFileContext>({ fileName: 'test.ts' });
        const promptTypes: PromptType[] = [
          'explainCode',
          'fixCode',
          'generateTests',
          'refactorCode',
        ];
        const expectedContents = ['/explain', '/fix', '/tests', '/refactor', ''];

        promptTypes.forEach(async (prompt, index) => {
          await controller.handleExtensionPrompt(prompt, fileContext);

          expect(controller.processNewUserRecord).toHaveBeenCalledWith(
            expect.objectContaining({
              content: expectedContents[index],
              type: prompt,
            }),
          );
        });
      });

      it('should return early if prompt type is not valid', async () => {
        const fileContext = createFakePartial<ActiveFileContext>({ fileName: 'test.ts' });
        await controller.handleExtensionPrompt('unknownType' as PromptType, fileContext);
        expect(controller.processNewUserRecord).not.toHaveBeenCalled();
      });
    });
  });
});

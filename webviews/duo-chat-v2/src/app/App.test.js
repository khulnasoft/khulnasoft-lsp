import { nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { DuoChat, DuoChatContextItemMenu } from '@khulnasoft/duo-ui';
import App, { eventTypes } from './App.vue';
import { messageBus } from './message_bus';

const pluginNotificationHandlers = {};
jest.mock('./message_bus', () => ({
  messageBus: {
    sendNotification: jest.fn(),
    onNotification: jest.fn().mockImplementation((type, callback) => {
      pluginNotificationHandlers[type] = callback;
    }),
  },
}));

describe('Duo Chat Vue app', () => {
  let wrapper;
  let mockFocusChatInput;

  const findDuoChat = () => wrapper.findComponent(DuoChat);
  const findContextMenu = () => wrapper.findComponent(DuoChatContextItemMenu);

  const createComponent = () => {
    wrapper = shallowMount(App);

    wrapper.vm.$refs.duoChat.$refs.prompt = {
      $el: {
        focus: mockFocusChatInput,
      },
    };
  };

  beforeEach(() => {
    mockFocusChatInput = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('application bootstrapping', () => {
    it('posts the `appReady` message when created', () => {
      expect(messageBus.sendNotification).not.toHaveBeenCalled();
      createComponent();
      expect(messageBus.sendNotification).toHaveBeenCalledWith('appReady');
    });

    it('should subscribe to plugin messages', () => {
      createComponent();
      eventTypes.forEach((eventType) => {
        expect(messageBus.onNotification).toHaveBeenCalledWith(eventType, expect.any(Function));
      });
    });
  });

  describe('GlDuoChat integration', () => {
    it('renders the Duo Chat component', () => {
      createComponent();
      expect(findDuoChat().exists()).toBe(true);
    });

    it('correctly sets the props on Duo Chat', async () => {
      const chatMessages = [
        {
          content: 'Foo',
          role: 'user',
        },
        {
          content: 'Bar',
          role: 'assistant',
        },
      ];

      createComponent();
      expect(findDuoChat().props('messages')).toEqual([]);

      chatMessages.forEach((record) => {
        pluginNotificationHandlers.newRecord({ record });
      });
      await nextTick();

      expect(findDuoChat().props('messages')).toEqual(chatMessages);
    });

    it('sets "slashCommands" when initial state is set', async () => {
      createComponent();
      const slashCommands = ['/help', '/explain'];
      pluginNotificationHandlers.setInitialState({ slashCommands });
      await nextTick();
      expect(findDuoChat().props('slashCommands')).toEqual(slashCommands);
    });

    it('sends regular prompt with the `newPrompt` event type', async () => {
      const question = 'What is KhulnaSoft?';
      createComponent();

      findDuoChat().vm.$emit('send-chat-prompt', question);
      await nextTick();

      expect(messageBus.sendNotification).toHaveBeenCalledWith('newPrompt', {
        record: {
          content: question,
        },
      });
    });

    it('sends clear command with the `clearChat` event type', async () => {
      createComponent();
      const clearChatMessage = '/clear';

      findDuoChat().vm.$emit('send-chat-prompt', clearChatMessage);

      expect(messageBus.sendNotification).toHaveBeenCalledWith('clearChat', {
        record: {
          content: clearChatMessage,
        },
      });
    });

    it('correctly sends insert code snippet event', () => {
      createComponent();
      const duoChat = findDuoChat();

      const codeSnippet = 'const foo = 42';
      duoChat.vm.$emit(
        'insert-code-snippet',
        new CustomEvent('insert-code-snippet', {
          detail: {
            code: codeSnippet,
          },
        }),
      );

      expect(messageBus.sendNotification).toHaveBeenCalledWith('insertCodeSnippet', {
        data: {
          snippet: codeSnippet,
        },
      });
    });

    it('focuses on the prompt with the `focusChat` event type', async () => {
      createComponent();

      pluginNotificationHandlers.focusChat();

      await nextTick();

      expect(mockFocusChatInput).toHaveBeenCalledTimes(1);
    });

    // TODO: focus state will be handled in a separate issue https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/1681
    xit('focuses on the prompt when the window itself gains focus', async () => {
      createComponent();

      window.dispatchEvent(new Event('focus'));
      await nextTick();

      expect(mockFocusChatInput).toHaveBeenCalledTimes(1);
    });

    describe('context items menu', () => {
      describe('when there are no categories', () => {
        it('does not render context menu when no categories have been set', () => {
          createComponent();
          expect(findContextMenu().exists()).toBe(false);
        });
      });

      describe('when there are categories', () => {
        beforeEach(() => {
          createComponent();
          pluginNotificationHandlers.contextCategoriesResult({
            categories: ['file', 'issue', 'merge_request'],
          });
        });

        it('renders context menu', () => {
          expect(findContextMenu().exists()).toBe(true);
        });

        it('maps display properties for categories', () => {
          expect(findContextMenu().props('categories')).toEqual([
            { label: 'Files', value: 'file', icon: 'document' },
            { label: 'Issues', value: 'issue', icon: 'issues' },
            { label: 'Merge Requests', value: 'merge_request', icon: 'merge-request' },
          ]);
        });

        describe('when there are context item selections', () => {
          const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
          beforeEach(() => {
            pluginNotificationHandlers.contextCurrentItemsResult({ items });
          });

          it('shows selections', () => {
            expect(findContextMenu().props('selections')).toBe(items);
          });
        });

        describe('when searching', () => {
          const query = { category: 'file', query: 'wowsa!' };

          beforeEach(() => {
            const menu = findContextMenu();
            menu.vm.$emit('search', query);
          });

          it('sets menu loading state', () => {
            expect(findContextMenu().props('loading')).toBe(true);
          });

          it('correctly sends "onContextMenuSearch" event', () => {
            expect(messageBus.sendNotification).toHaveBeenCalledWith('contextItemSearchQuery', {
              query,
            });
          });

          describe('when there are results', () => {
            const results = [{ id: '1' }, { id: '2' }, { id: '3' }];
            beforeEach(() => {
              pluginNotificationHandlers.contextItemSearchResult({ results });
            });

            it('sets menu loading state', () => {
              expect(findContextMenu().props('loading')).toBe(false);
            });

            it('shows results in menu', () => {
              expect(findContextMenu().props('results')).toBe(results);
            });
          });

          describe('when there is an error', () => {
            const errorMessage = 'oh no :(';
            beforeEach(() => {
              pluginNotificationHandlers.contextItemSearchResult({ results: [], errorMessage });
            });

            it('sets menu loading state', () => {
              expect(findContextMenu().props('loading')).toBe(false);
            });

            it('shows error in menu', () => {
              expect(findContextMenu().props('error')).toBe(errorMessage);
            });
          });
        });

        describe('when selecting a context item', () => {
          const item = { id: '1' };

          beforeEach(() => {
            const menu = findContextMenu();
            menu.vm.$emit('select', item);
          });

          it('correctly sends "contextItemAdded" event', () => {
            expect(messageBus.sendNotification).toHaveBeenCalledWith('contextItemAdded', { item });
          });
        });

        describe('when removing a context item', () => {
          const item = { id: '1' };

          beforeEach(() => {
            const menu = findContextMenu();
            menu.vm.$emit('remove', item);
          });

          it('correctly sends "contextItemRemoved" event', () => {
            expect(messageBus.sendNotification).toHaveBeenCalledWith('contextItemRemoved', {
              item,
            });
          });
        });
      });
    });
  });
});

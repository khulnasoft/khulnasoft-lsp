<script>
import { DuoChat, DuoChatContextItemMenu } from '@khulnasoft/duo-ui';
import { MESSAGES_WITHOUT_RESPONSES } from './constants';
import renderGFM from './render_gfm';
import renderDuoChatMarkdownPreview from './render_markdown';
import { messageBus } from './message_bus';
import { CompositeDisposable } from '@khulnasoft/disposable';

export const eventTypes = [
  'clearChat',
  'newRecord',
  'updateRecord',
  'cancelPrompt',
  'focusChat',
  'contextCategoriesResult',
  'contextCurrentItemsResult',
  'contextItemSearchResult',
  'setInitialState',
];

const i18n = {
  predefinedPrompts: [
    'How do I change my password in KhulnaSoft?',
    'How do I fork a project?',
    'How do I clone a repository?',
    'How do I create a template?',
  ],
  chatPromptPlaceholder: 'Type "/" for slash commands',
};

export default {
  name: 'KhulnaSoftDuoChat',
  i18n,
  components: {
    DuoChat,
    DuoChatContextItemMenu,
  },
  data() {
    return {
      chatMessages: [],
      promptDraft: null,
      canceledPromptRequestIds: [],
      isLoading: false,
      contextMenuCategories: null,
      contextMenuIsLoading: false,
      contextMenuError: null,
      contextSelections: [],
      contextSearchResults: [],
      subscriptions: new CompositeDisposable(),
      slashCommands: [],
    };
  },
  created() {
    eventTypes.forEach((eventType) => {
      this.subscriptions.add(
        messageBus.onNotification(eventType, (data) => {
          this.handlePluginEvent({data: {eventType, ...data}});
        }));
    });

    messageBus.sendNotification('appReady');
  },
  onBeforeDestroy() {
    this.subscriptions.dispose();
  },
  computed: {
    messages() {
      return this.chatMessages.filter((message) => message.state !== 'pending');
    },
    pinnedContextEnabled() {
      return Boolean(this.contextMenuCategories?.length);
    },
  },
  mounted() {
    // this.attachToVsCodeState();
    // When using the built in VSCode commands to interact with the Duo Chat panel, such as
    // "View: Toggle KhulnaSoft Duo Chat", and "View: Focus into Secondary Sidebar" (or whichever sidebar is configured to contain Duo chat)
    // our custom "focusChat" event is not fired. So we also need to manually listen to the panel window itself gaining focus.
   // TODO: will be handled in a separate issue https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/1681
    // window.addEventListener('focus', this.focusChat);
  },
  beforeDestroy() {
    // window.removeEventListener('focus', this.focusChat);
  },
  watch: {
    promptDraft(newVal) {
      // window.vsCodeApi.setState({
      //   promptDraft: newVal,
      // });
    },
    chatMessages() {
      this.updateIsLoading();
    },
  },
  provide: {
    renderGFM, // Provide the renderGFM function to the DuoChat component
    renderMarkdown: renderDuoChatMarkdownPreview,
  },
  methods: {
    handlePluginEvent(event) {
      const message = event.data;
      switch (message.eventType) {
        case 'setInitialState': {
          this.slashCommands = message.slashCommands;
          break;
        }
        case 'clearChat': {
          this.isLoading = false;
          this.chatMessages = [];
          break;
        }
        case 'newRecord': {
          this.newRecord(message.record);
          break;
        }
        case 'updateRecord': {
          this.updateRecord(message.record);
          break;
        }
        case 'cancelPrompt': {
          this.canceledPromptRequestIds = message.canceledPromptRequestIds;
          break;
        }
        case 'focusChat': {
          this.focusChat();
          break;
        }
        case 'contextCategoriesResult': {
          const categoryDisplayData = [
            { label: 'Files', value: 'file', icon: 'document' },
            { label: 'Local Git', value: 'local_git', icon: 'git' },
            { label: 'Issues', value: 'issue', icon: 'issues' },
            { label: 'Merge Requests', value: 'merge_request', icon: 'merge-request' },
            { label: 'Dependencies', value: 'dependency', icon: 'package' },
          ];
          this.contextMenuCategories = categoryDisplayData.filter((category) =>
            message.categories.includes(category.value),
          );
          break;
        }
        case 'contextCurrentItemsResult': {
          this.contextSelections = message.items;
          break;
        }
        case 'contextItemSearchResult': {
          this.contextSearchResults = message.results;
          this.contextMenuError = message.errorMessage || null;
          this.contextMenuIsLoading = false;
          break;
        }
        default:
          console.warn('Chat view received unexpected message type.');
          break;
      }
    },
    newRecord(record) {
      this.chatMessages.push(record);
    },
    updateRecord(record) {
      const index = this.chatMessages.findIndex((r) => r.id === record.id);
      this.chatMessages.splice(index, 1, record);
    },
    focusChat() {
      this.$refs.duoChat?.$refs?.prompt?.$el?.focus();
    },
    attachToVsCodeState() {
      // TODO: figure out what this code does
      /* const currentState = window.vsCodeApi.getState();
      if (currentState && currentState.promptDraft) {
        this.promptDraft = currentState.promptDraft;
      }*/
    },
    onSendChatPrompt(question) {
      const eventType =
        question === MESSAGES_WITHOUT_RESPONSES.CLEAR ||
        question === MESSAGES_WITHOUT_RESPONSES.CLEAN
          ? 'clearChat'
          : 'newPrompt';

      this.isLoading = !this.isResetMessage(question);

      messageBus.sendNotification(eventType, {
        record: {
          content: question,
        },
      });
    },
    handleKeyPress(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.onSendChatPrompt();
      }
    },
    onChatCancel() {
      const assistantMessage = this.chatMessages[this.chatMessages.length - 1];

      messageBus.sendNotification('cancelPrompt', {
        record: {
          canceledPromptRequestId: assistantMessage.requestId,
        },
      });

      this.isLoading = false;
    },
    updateIsLoading() {
      const lastMessage = this.chatMessages[this.chatMessages.length - 1];
      const isNotCanceled = !this.canceledPromptRequestIds.includes(lastMessage?.requestId);
      this.isLoading =
        lastMessage &&
        (lastMessage.role === 'user' || (lastMessage.state === 'pending' && isNotCanceled)) &&
        !this.isResetMessage(lastMessage.content);
    },
    onTrackFeedback({ feedbackChoices, didWhat, improveWhat } = {}) {
      messageBus.sendNotification('trackFeedback', {
        data: {
          feedbackChoices,
          improveWhat,
          didWhat,
        },
      });
    },
    isResetMessage(prompt) {
      return prompt === MESSAGES_WITHOUT_RESPONSES.RESET;
    },
    onInsertCodeSnippet(event) {
      const snippet = event.detail.code;

      messageBus.sendNotification('insertCodeSnippet', {
        data: {
          snippet,
        },
      });
    },
    onContextMenuSearch({ category, query }) {
      this.contextMenuIsLoading = true;
      this.contextMenuError = null;

      messageBus.sendNotification('contextItemSearchQuery', {
        query: {
          query,
          category,
        },
      });
    },
    onSelectContextItem(item) {
      messageBus.sendNotification('contextItemAdded', {
        item,
      });
    },
    onRemoveContextItem(item) {
      messageBus.sendNotification('contextItemRemoved', {
        item,
      });
    },
    onGetContextItemContent({ contextItem, messageId }) {
      messageBus.sendNotification('contextItemGetContent', {
        item: contextItem,
        messageId,
      });
    },
  },
};
</script>
<template>
  <duo-chat
    ref="duoChat"
    :messages="messages"
    error=""
    :is-loading="isLoading"
    :predefined-prompts="$options.i18n.predefinedPrompts"
    :slash-commands="slashCommands"
    :badge-title="null"
    :enable-code-insertion="true"
    :canceled-request-ids="canceledPromptRequestIds"
    :chat-prompt-placeholder="$options.i18n.chatPromptPlaceholder"
    :should-render-resizable="false"
    @chat-cancel="onChatCancel"
    @send-chat-prompt="onSendChatPrompt"
    @track-feedback="onTrackFeedback"
    @insert-code-snippet="onInsertCodeSnippet"
    @get-context-item-content="onGetContextItemContent"
  >
    <template
      v-if="pinnedContextEnabled"
      #context-items-menu="{ isOpen, onClose, setRef, focusPrompt }"
    >
      <duo-chat-context-item-menu
        :ref="setRef"
        :open="isOpen"
        :selections="contextSelections"
        :categories="contextMenuCategories"
        :loading="contextMenuIsLoading"
        :error="contextMenuError"
        :results="contextSearchResults"
        @search="onContextMenuSearch"
        @select="onSelectContextItem"
        @remove="onRemoveContextItem"
        @close="onClose"
        @focus-prompt="focusPrompt"
        @get-context-item-content="onGetContextItemContent"
      />
    </template>
  </duo-chat>
</template>
<style lang="scss">
@import 'styles.scss';
</style>

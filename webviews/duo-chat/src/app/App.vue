<script>
import { GlDuoChat } from '@khulnasoft/ui';
import { SPECIAL_MESSAGES } from './constants';
import { renderGFM } from './render_gfm';
import { renderDuoChatMarkdownPreview } from './render_markdown';
import { messageBus } from './message_bus';
import { CompositeDisposable } from '@khulnasoft/disposable';

const i18n = {
  predefinedPrompts: [
    'How do I change my password in KhulnaSoft?',
    'How do I fork a project?',
    'How do I clone a repository?',
    'How do I create a template?',
  ],
};

export default {
  name: 'KhulnaSoftDuoChat',
  i18n,
  components: {
    GlDuoChat,
  },
  props: {
    slashCommands: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  data() {
    return {
      chatMessages: [],
      promptDraft: null,
      subscriptions: new CompositeDisposable(),
    };
  },
  created() {
    this.subscriptions.add(messageBus.onNotification('newRecord', this.newRecord));
    this.subscriptions.add(messageBus.onNotification('updateRecord', this.updateRecord));
    this.subscriptions.add(
      messageBus.onNotification('cleanChat', () => {
        this.chatMessages = [];
      }),
    );
  },
  onBeforeDestroy() {
    this.subscriptions.dispose();
  },
  computed: {
    isLoading() {
      return this.chatMessages.findIndex((message) => message.state === 'pending') >= 0;
    },
    messages() {
      return this.chatMessages.filter((message) => message.state !== 'pending');
    },
  },
  provide: {
    renderGFM, // Provide the renderGFM function to the GlDuoChat component
    renderMarkdown: renderDuoChatMarkdownPreview,
  },
  methods: {
    newRecord(record) {
      this.chatMessages.push(record);
      this.scrollBottom();
    },
    updateRecord(record) {
      const index = this.chatMessages.findIndex((r) => r.id === record.id);
      this.chatMessages.splice(index, 1, record);
      this.scrollBottom();
    },
    scrollBottom() {
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }, 20); // TODO: replace this hack with proper CSS.
    },
    onSendChatPrompt(question) {
      if (question === SPECIAL_MESSAGES.CLEAN || question === SPECIAL_MESSAGES.CLEAR) {
        messageBus.sendNotification('cleanChat');
        return;
      }

      messageBus.sendNotification('newPrompt', {
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
    onTrackFeedback({ extendedTextFeedback, feedbackChoices } = {}) {
      messageBus.sendNotification('trackFeedback', {
        data: {
          extendedTextFeedback,
          feedbackChoices,
        },
      });
    },
  },
};
</script>
<template>
  <gl-duo-chat
    :messages="messages"
    error=""
    :is-loading="isLoading"
    :predefined-prompts="$options.i18n.predefinedPrompts"
    :slash-commands="slashCommands"
    :badge-title="null"
    @send-chat-prompt="onSendChatPrompt"
    @track-feedback="onTrackFeedback"
  />
</template>
<style lang="scss">
@import 'styles.scss';
</style>

<script>
import { GlButton } from '@khulnasoft/ui';
import GlDuoChat from '../../../duo_chat/duo_chat.vue';
import { isPaused, isTerminated } from '../../../../common/duo_workflow_status';
import { toolUseToMessage } from '../../../tools';

export default {
  name: 'DuoWorkflowChat',
  components: {
    GlButton,
    GlDuoChat,
  },
  props: {
    conversationHistory: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  provide: {
    renderGFM: (element, role) => {
      element.classList.add('gl-markdown', 'gl-compact-markdown');
      if (role === 'system') {
        element.classList.add('duo-system-message', 'gl-text-sm');
      }
    },
  },
  data() {
    return {
      allMessages: new Set(),
      chatMessages: [],
      scrollToMessage: true,
      isScrolling: false,
      isLoading: false,
    };
  },
  watch: {
    conversationHistory: {
      immediate: true,
      handler(newHistory, oldHistory) {
        if (newHistory === oldHistory) return;

        const messages = this.getChatMessages(newHistory);
        const allMessages = new Set(messages.map(({ text }) => text));

        const newMessageSet = allMessages.difference(this.allMessages);

        const newMessages = messages.filter(({ text }) => newMessageSet.has(text));

        this.allMessages = allMessages;
        this.chatMessages = [
          ...this.chatMessages,
          ...newMessages.map(({ text, type: messageType, name }) => ({
            role: this.setRole({ messageType, name }),
            content: text,
            highlight: this.isUserInputRequest({ messageType, name }),
          })),
        ].map((message, index, messages) => ({
          ...message,
          highlight: this.isLastHighlighted(messages, index),
        }));
      },
    },
  },
  methods: {
    isLastHighlighted(messages, index) {
      return messages.findLastIndex((m) => m.highlight) === index;
    },
    getChatMessages(history) {
      return Object.values(this.conversationHistory).flatMap((messages) => {
        return messages
          .filter(({ type: messageType }) => messageType === 'AIMessage')
          .flatMap(({ content = [] }) => {
            if (typeof content === 'string') return [];
            return content.filter(({ type: messageType, name }) => messageType === 'tool_use');
          })
          .map((message) => this.toolUseToMessage(message))
          .filter(({ text }) => text);
      });
    },
    isUserInputRequest({ messageType, name }) {
      return messageType === 'tool_use' && name === 'get_user_input';
    },
    setRole({ messageType, name }) {
      return name === 'handover_tool' || name === 'set_task_status' ? 'assistant' : 'system';
    },
    toolUseToMessage(toolUse) {
      return toolUseToMessage(toolUse);
    },
    async onChatSend(message) {
      this.isLoading = true;
      const event = this.hasHighlight ? 'repsonse' : 'message';
      this.$emit(event, message);
      this.chatMessages = [
        ...this.chatMessages.map((message) => ({ ...message, highlight: false })),
        { content: message, role: 'user' },
      ];
      await this.$nextTick();
      this.isLoading = false;
    },
  },
  computed: {
    isPaused() {
      return isPaused(this.status);
    },
    isTerminated() {
      return isTerminated(this.status);
    },
  },
  predefinedPrompts: [],
};
</script>
<template>
  <gl-duo-chat
    :messages="chatMessages"
    title="Duo Workflow"
    :predefined-prompts="$options.predefinedPrompts"
    chat-prompt-placeholder="Message"
    :is-chat-available="!isTerminated"
    :show-feedback="false"
    :show-header="false"
    :is-loading="isLoading"
    @send-chat-prompt="onChatSend"
  >
    <template v-if="isPaused" #context-items-menu>
      <div class="gl-mb-4 gl-gap-x-4 gl-flex gl-items-center">
        <span class="gl-text-base gl-text-secondary">Execution is paused.</span
        ><gl-button icon="play" variant="link" @click="$emit('resume')">Resume</gl-button>
      </div>
    </template>
  </gl-duo-chat>
</template>

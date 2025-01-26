<script>
import GlDuoChatMessage from '../duo_chat_message/duo_chat_message.vue';

const i18n = {
  CONVERSATION_NEW_CHAT: 'New chat',
};

const isMessage = (item) => Boolean(item) && item?.role;

// eslint-disable-next-line unicorn/no-array-callback-reference
const itemsValidator = (items) => items.every(isMessage);

export default {
  name: 'GlDuoChatConversation',
  components: {
    GlDuoChatMessage,
  },
  props: {
    /**
     * Messages to display
     */
    messages: {
      type: Array,
      required: false,
      default: () => [],
      validator: itemsValidator,
    },
    canceledRequestIds: {
      type: Array,
      required: true,
    },
    /**
     * Whether the insertCode feature should be available.
     */
    enableCodeInsertion: {
      type: Boolean,
      required: true,
    },
    /**
     * Whether to show the delimiter before this conversation
     */
    showDelimiter: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  methods: {
    onTrackFeedback(event) {
      /**
       * Notify listeners about the feedback form submission on a response message.
       * @param {*} event An event, containing the feedback choices and the extended feedback text.
       */
      this.$emit('track-feedback', event);
    },
    onInsertCodeSnippet(e) {
      this.$emit('insert-code-snippet', e);
    },
    onGetContextItemContent(e) {
      this.$emit('get-context-item-content', e);
    },
  },
  i18n,
};
</script>
<template>
  <div class="gl-pl-4 gl-pt-4" :class="{ 'insert-code-hidden': !enableCodeInsertion }">
    <div
      v-if="showDelimiter"
      class="gl-my-5 gl-flex gl-items-center gl-gap-4 gl-text-gray-500"
      data-testid="conversation-delimiter"
    >
      <hr class="gl-grow" />
      <span>{{ $options.i18n.CONVERSATION_NEW_CHAT }}</span>
      <hr class="gl-grow" />
    </div>
    <gl-duo-chat-message
      v-for="(msg, index) in messages"
      :key="`${msg.role}-${index}`"
      :message="msg"
      :is-cancelled="canceledRequestIds.includes(msg.requestId)"
      @track-feedback="onTrackFeedback"
      @insert-code-snippet="onInsertCodeSnippet"
      @get-context-item-content="onGetContextItemContent"
    />
  </div>
</template>

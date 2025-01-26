<script>
import throttle from 'lodash/throttle';
import emptySvg from '@khulnasoft/svgs/dist/illustrations/empty-state/empty-activity-md.svg';
import {
  GlDropdownItem,
  GlCard,
  GlEmptyState,
  GlButton,
  GlAlert,
  GlFormInputGroup,
  GlFormTextarea,
  GlForm,
  GlExperimentBadge,
  GlSafeHtmlDirective as SafeHtml,
} from '@khulnasoft/ui';
import { translate } from './i18n.js';
import GlDuoChatLoader from './components/duo_chat_loader/duo_chat_loader.vue';
import GlDuoChatPredefinedPrompts from './components/duo_chat_predefined_prompts/duo_chat_predefined_prompts.vue';
import GlDuoChatConversation from './components/duo_chat_conversation/duo_chat_conversation.vue';
import {
  CHAT_RESET_MESSAGE,
  CHAT_CLEAR_MESSAGE,
  CHAT_INCLUDE_MESSAGE,
  MESSAGE_MODEL_ROLES,
} from './constants';

export const i18n = {
  CHAT_DEFAULT_TITLE: translate('GlDuoChat.chatDefaultTitle', 'KhulnaSoft Duo Chat'),
  CHAT_CLOSE_LABEL: translate('GlDuoChat.chatCloseLabel', 'Close the Code Explanation'),
  CHAT_EMPTY_STATE_TITLE: translate('GlDuoChat.chatEmptyStateTitle', 'Ask a question'),
  CHAT_EMPTY_STATE_DESC: translate(
    'GlDuoChat.chatEmptyStateDesc',
    'KhulnaSoft Duo Chat is your AI-powered assistant.',
  ),
  CHAT_EMPTY_STATE_SECONDARY_DESC: translate(
    'GlDuoChat.chatEmptyStateSecondaryDesc',
    'Responses may be inaccurate. Verify before use.',
  ),
  CHAT_PROMPT_PLACEHOLDER_DEFAULT: translate(
    'GlDuoChat.chatPromptPlaceholderDefault',
    'KhulnaSoft Duo Chat',
  ),
  CHAT_PROMPT_PLACEHOLDER_WITH_COMMANDS: translate(
    'GlDuoChat.chatPromptPlaceholderWithCommands',
    'Type "/" for slash commands',
  ),
  CHAT_SUBMIT_LABEL: translate('GlDuoChat.chatSubmitLabel', 'Send chat message.'),
  CHAT_CANCEL_LABEL: translate('GlDuoChat.chatCancelLabel', 'Cancel'),
  CHAT_DEFAULT_PREDEFINED_PROMPTS: [
    translate(
      'GlDuoChat.chatDefaultPredefinedPromptsChangePassword',
      'How do I change my password in KhulnaSoft?',
    ),
    translate('GlDuoChat.chatDefaultPredefinedPromptsForkProject', 'How do I fork a project?'),
    translate(
      'GlDuoChat.chatDefaultPredefinedPromptsCloneRepository',
      'How do I clone a repository?',
    ),
    translate(
      'GlDuoChat.chatDefaultPredefinedPromptsCreateTemplate',
      'How do I create a template?',
    ),
  ],
};

const isMessage = (item) => Boolean(item) && item?.role;
const isSlashCommand = (command) => Boolean(command) && command?.name && command.description;

// eslint-disable-next-line unicorn/no-array-callback-reference
const itemsValidator = (items) => items.every(isMessage);
// eslint-disable-next-line unicorn/no-array-callback-reference
const slashCommandsValidator = (commands) => commands.every(isSlashCommand);

export default {
  name: 'GlDuoChat',
  components: {
    GlEmptyState,
    GlButton,
    GlAlert,
    GlFormInputGroup,
    GlFormTextarea,
    GlForm,
    GlExperimentBadge,
    GlDuoChatLoader,
    GlDuoChatPredefinedPrompts,
    GlDuoChatConversation,
    GlCard,
    GlDropdownItem,
  },
  directives: {
    SafeHtml,
  },
  props: {
    /**
     * The title of the chat/feature.
     */
    title: {
      type: String,
      required: false,
      default: i18n.CHAT_DEFAULT_TITLE,
    },
    /**
     * Array of messages to display in the chat.
     */
    messages: {
      type: Array,
      required: false,
      default: () => [],
      validator: itemsValidator,
    },
    /**
     * Array of RequestIds that have been canceled.
     */
    canceledRequestIds: {
      type: Array,
      required: false,
      default: () => [],
    },
    /**
     * A non-recoverable error message to display in the chat.
     */
    error: {
      type: String,
      required: false,
      default: '',
    },
    /**
     * Whether the chat is currently fetching a response from AI.
     */
    isLoading: {
      type: Boolean,
      required: false,
      default: false,
    },
    /**
     * Whether the conversational interfaces should be enabled.
     */
    isChatAvailable: {
      type: Boolean,
      required: false,
      default: true,
    },
    /**
     * Whether the insertCode feature should be available.
     */
    enableCodeInsertion: {
      type: Boolean,
      required: false,
      default: false,
    },
    /**
     * Array of predefined prompts to display in the chat to start a conversation.
     */
    predefinedPrompts: {
      type: Array,
      required: false,
      default: () => i18n.CHAT_DEFAULT_PREDEFINED_PROMPTS,
    },
    /**
     * URL to the help page. This is passed down to the `GlExperimentBadge` component.
     */
    badgeHelpPageUrl: {
      type: String,
      required: false,
      default: '',
    },
    /**
     * The type of the badge. This is passed down to the `GlExperimentBadge` component. Refer that component for more information.
     */
    badgeType: {
      type: String || null,
      required: false,
      default: 'experiment',
    },
    /**
     * The current tool's name to display in the loading message while waiting for a response from AI. Refer the `GlDuoChatLoader` component for more information.
     */
    toolName: {
      type: String,
      required: false,
      default: i18n.CHAT_DEFAULT_TITLE,
    },
    /**
     * Array of slash commands to display in the chat.
     */
    slashCommands: {
      type: Array,
      required: false,
      default: () => [],
      validator: slashCommandsValidator,
    },
    /**
     * Whether the header should be displayed.
     */
    showHeader: {
      type: Boolean,
      required: false,
      default: true,
    },
    /**
     * Override the default empty state title text.
     */
    emptyStateTitle: {
      type: String,
      required: false,
      default: i18n.CHAT_EMPTY_STATE_TITLE,
    },
    /**
     * Override the default empty state description text.
     */
    emptyStateDescription: {
      type: String,
      required: false,
      default: i18n.CHAT_EMPTY_STATE_DESC,
    },
    /**
     * Override the default empty state description secondary text.
     */
    emptyStateSecondaryDescription: {
      type: String,
      required: false,
      default: i18n.CHAT_EMPTY_STATE_SECONDARY_DESC,
    },
    /**
     * Override the default chat prompt placeholder text.
     */
    chatPromptPlaceholder: {
      type: String,
      required: false,
      default: '',
    },
  },
  data() {
    return {
      isHidden: false,
      prompt: '',
      scrolledToBottom: true,
      activeCommandIndex: 0,
      displaySubmitButton: true,
      compositionJustEnded: false,
      contextItemsMenuIsOpen: false,
      contextItemMenuRef: null,
    };
  },
  computed: {
    withSlashCommands() {
      return this.slashCommands.length > 0;
    },
    hasMessages() {
      return this.messages?.length > 0;
    },
    conversations() {
      if (!this.hasMessages) return [];

      return this.messages.reduce(
        (acc, message) => {
          if (message.content === CHAT_RESET_MESSAGE) {
            acc.push([]);
          } else {
            acc[acc.length - 1].push(message);
          }
          return acc;
        },
        [[]],
      );
    },
    lastMessage() {
      return this.messages?.[this.messages.length - 1];
    },
    caseInsensitivePrompt() {
      return this.prompt.toLowerCase().trim();
    },
    resetDisabled() {
      if (this.isLoading || !this.hasMessages) {
        return true;
      }
      return this.lastMessage?.content === CHAT_RESET_MESSAGE;
    },
    isStreaming() {
      if (this.canceledRequestIds.includes(this.lastMessage?.requestId)) {
        return false;
      }
      return Boolean(
        (this.lastMessage?.chunks?.length > 0 && !this.lastMessage?.content) ||
          typeof this.lastMessage?.chunkId === 'number',
      );
    },
    filteredSlashCommands() {
      return this.slashCommands
        .filter((c) => c.name.toLowerCase().startsWith(this.caseInsensitivePrompt))
        .filter((c) => {
          if (c.name === CHAT_INCLUDE_MESSAGE) {
            return this.hasContextItemSelectionMenu;
          }
          return true;
        });
    },
    shouldShowSlashCommands() {
      if (!this.withSlashCommands || this.contextItemsMenuIsOpen) return false;
      const startsWithSlash = this.caseInsensitivePrompt.startsWith('/');
      const startsWithSlashCommand = this.slashCommands.some((c) =>
        this.caseInsensitivePrompt.startsWith(c.name),
      );
      return startsWithSlash && this.filteredSlashCommands.length && !startsWithSlashCommand;
    },
    shouldShowContextItemSelectionMenu() {
      if (!this.hasContextItemSelectionMenu) {
        return false;
      }

      const isSlash = this.caseInsensitivePrompt === '/';
      if (!this.caseInsensitivePrompt || isSlash) {
        // if user has removed entire command (or whole command except for '/') we should close context item menu and allow slash command menu to show again
        return false;
      }

      return CHAT_INCLUDE_MESSAGE.startsWith(this.caseInsensitivePrompt);
    },
    inputPlaceholder() {
      if (this.chatPromptPlaceholder) {
        return this.chatPromptPlaceholder;
      }

      return this.withSlashCommands
        ? i18n.CHAT_PROMPT_PLACEHOLDER_WITH_COMMANDS
        : i18n.CHAT_PROMPT_PLACEHOLDER_DEFAULT;
    },
    hasContextItemSelectionMenu() {
      return Boolean(this.contextItemMenuRef);
    },
  },
  watch: {
    isLoading(newVal) {
      if (!newVal && !this.isStreaming) {
        this.displaySubmitButton = true; // Re-enable submit button when loading stops
      }
      this.isHidden = false;
    },
    isStreaming(newVal) {
      if (!newVal && !this.isLoading) {
        this.displaySubmitButton = true; // Re-enable submit button when streaming stops
      }
    },
    lastMessage(newMessage) {
      if (this.scrolledToBottom || newMessage.role.toLowerCase() === MESSAGE_MODEL_ROLES.user) {
        // only scroll to bottom on new message if the user hasn't explicitly scrolled up to view an earlier message
        // or if the user has just submitted a new message
        this.scrollToBottom();
      }
    },
  },
  created() {
    this.handleScrollingTrottled = throttle(this.handleScrolling, 200); // Assume a 200ms throttle for example
  },
  mounted() {
    this.scrollToBottom();
  },
  methods: {
    compositionEnd() {
      this.compositionJustEnded = true;
    },
    hideChat() {
      this.isHidden = true;
      /**
       * Emitted when clicking the cross in the title and the chat gets closed.
       */
      this.$emit('chat-hidden');
    },
    cancelPrompt() {
      /**
       * Emitted when user clicks the stop button in the textarea
       */

      this.displaySubmitButton = true;
      this.$emit('chat-cancel');
      this.setPromptAndFocus();
    },
    sendChatPrompt() {
      if (!this.displaySubmitButton || this.contextItemsMenuIsOpen) {
        return;
      }
      if (this.prompt) {
        if (this.caseInsensitivePrompt === CHAT_RESET_MESSAGE && this.resetDisabled) {
          return;
        }

        if (
          this.caseInsensitivePrompt.startsWith(CHAT_INCLUDE_MESSAGE) &&
          this.hasContextItemSelectionMenu
        ) {
          this.contextItemsMenuIsOpen = true;
          return;
        }

        if (![CHAT_RESET_MESSAGE, CHAT_CLEAR_MESSAGE].includes(this.caseInsensitivePrompt)) {
          this.displaySubmitButton = false;
        }

        /**
         * Emitted when a new user prompt should be sent out.
         *
         * @param {String} prompt The user prompt to send.
         */
        this.$emit('send-chat-prompt', this.prompt.trim());

        this.setPromptAndFocus();
      }
    },
    sendPredefinedPrompt(prompt) {
      this.contextItemsMenuIsOpen = false;
      this.prompt = prompt;
      this.sendChatPrompt();
    },
    handleScrolling(event) {
      const { scrollTop, offsetHeight, scrollHeight } = event.target;
      this.scrolledToBottom = scrollTop + offsetHeight >= scrollHeight;
    },
    async scrollToBottom() {
      await this.$nextTick();

      this.$refs.anchor?.scrollIntoView?.();
    },
    focusChatInput() {
      // This method is also called directly by consumers of this component
      // https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/dae2d4669ab4da327921492a2962beae8a05c290/webviews/vue2/gitlab_duo_chat/src/App.vue#L109
      this.$refs.prompt?.$el?.focus();
    },
    onTrackFeedback(event) {
      /**
       * Notify listeners about the feedback form submission on a response message.
       * @param {*} event An event, containing the feedback choices and the extended feedback text.
       */
      this.$emit('track-feedback', event);
    },
    sendChatPromptOnEnter(e) {
      const { metaKey, ctrlKey, altKey, shiftKey, isComposing } = e;
      const isModifierKey = metaKey || ctrlKey || altKey || shiftKey;

      return !(isModifierKey || isComposing || this.compositionJustEnded);
    },
    onInputKeyup(e) {
      const { key } = e;

      if (this.contextItemsMenuIsOpen) {
        if (!this.shouldShowContextItemSelectionMenu) {
          this.contextItemsMenuIsOpen = false;
        }
        this.contextItemMenuRef?.handleKeyUp(e);
        return;
      }
      if (this.caseInsensitivePrompt === CHAT_INCLUDE_MESSAGE) {
        this.contextItemsMenuIsOpen = true;
        return;
      }

      if (this.shouldShowSlashCommands) {
        e.preventDefault();

        if (key === 'Enter') {
          this.selectSlashCommand(this.activeCommandIndex);
        } else if (key === 'ArrowUp') {
          this.prevCommand();
        } else if (key === 'ArrowDown') {
          this.nextCommand();
        } else {
          this.activeCommandIndex = 0;
        }
      } else if (key === 'Enter' && this.sendChatPromptOnEnter(e)) {
        e.preventDefault();

        this.sendChatPrompt();
      }

      this.compositionJustEnded = false;
    },
    prevCommand() {
      this.activeCommandIndex -= 1;
      this.wrapCommandIndex();
    },
    nextCommand() {
      this.activeCommandIndex += 1;
      this.wrapCommandIndex();
    },
    wrapCommandIndex() {
      if (this.activeCommandIndex < 0) {
        this.activeCommandIndex = this.filteredSlashCommands.length - 1;
      } else if (this.activeCommandIndex >= this.filteredSlashCommands.length) {
        this.activeCommandIndex = 0;
      }
    },
    async setPromptAndFocus(prompt = '') {
      this.prompt = prompt;
      await this.$nextTick();
      this.focusChatInput();
    },
    selectSlashCommand(index) {
      const command = this.filteredSlashCommands[index];
      if (command.shouldSubmit) {
        this.prompt = command.name;
        this.sendChatPrompt();
      } else {
        this.setPromptAndFocus(`${command.name} `);

        if (command.name === CHAT_INCLUDE_MESSAGE && this.hasContextItemSelectionMenu) {
          this.contextItemsMenuIsOpen = true;
        }
      }
    },
    onInsertCodeSnippet(e) {
      /**
       * Emit insert-code-snippet event that clients can use to interact with a suggested code.
       * @param {*} event An event containing code string in the "detail.code" field.
       */
      this.$emit('insert-code-snippet', e);
    },
    onGetContextItemContent(event) {
      /**
       * Emit get-context-item-content event that tells clients to load the full file content for a selected context item.
       * The fully hydrated context item should be updated in the chat message context item.
       * @param {*} event An event containing the message ID and context item to hydrate
       */
      this.$emit('get-context-item-content', event);
    },
    closeContextItemsMenuOpen() {
      this.contextItemsMenuIsOpen = false;
      this.setPromptAndFocus();
    },
    setContextItemsMenuRef(ref) {
      this.contextItemMenuRef = ref;
    },
  },
  i18n,
  emptySvg,
};
</script>
<template>
  <aside
    v-if="!isHidden"
    id="chat-component"
    class="markdown-code-block gl-w-full gl-border-l gl-shadow-none gl-flex gl-flex-col gl-h-[100vh]"
    role="complementary"
    data-testid="chat-component"
  >
    <header
      v-if="showHeader"
      data-testid="chat-header"
      class="duo-chat-drawer-header duo-chat-drawer-header-sticky gl-z-200 gl-bg-gray-10 !gl-p-0"
    >
      <div class="drawer-title gl-flex gl-items-center gl-justify-start gl-p-5">
        <h3 class="gl-my-0 gl-text-size-h2">{{ title }}</h3>
        <gl-experiment-badge
          v-if="badgeType"
          :help-page-url="badgeHelpPageUrl"
          :type="badgeType"
          container-id="chat-component"
        />
        <gl-button
          category="tertiary"
          variant="default"
          icon="close"
          size="small"
          class="gl-ml-auto"
          data-testid="chat-close-button"
          :aria-label="$options.i18n.CHAT_CLOSE_LABEL"
          @click="hideChat"
        />
      </div>

      <!--
        @slot Subheader to be rendered right after the title. It is sticky and stays on top of the chat no matter the number of messages.
      -->
      <slot name="subheader"></slot>

      <!-- Ensure that the global error is not scrolled away -->
      <gl-alert
        v-if="error"
        key="error"
        :dismissible="false"
        variant="danger"
        class="!gl-pl-9"
        role="alert"
        data-testid="chat-error"
      >
        <span v-safe-html="error"></span>
      </gl-alert>
    </header>

    <div
      class="gl-bg-inherit gl-h-full gl-shrink gl-overflow-auto"
      data-testid="chat-history"
      @scroll="handleScrollingTrottled"
    >
      <transition-group
        tag="section"
        name="message"
        class="duo-chat-history gl-bg-gray-10 gl-h-full"
      >
        <gl-duo-chat-conversation
          v-for="(conversation, index) in conversations"
          :key="`conversation-${index}`"
          :enable-code-insertion="enableCodeInsertion"
          :messages="conversation"
          :canceled-request-ids="canceledRequestIds"
          :show-delimiter="index > 0"
          @track-feedback="onTrackFeedback"
          @insert-code-snippet="onInsertCodeSnippet"
          @get-context-item-content="onGetContextItemContent"
        />
        <gl-duo-chat-loader v-if="isLoading" key="loader" :tool-name="toolName" />
        <div key="anchor" ref="anchor" class="scroll-anchor"></div>
      </transition-group>
    </div>
    <footer
      v-if="isChatAvailable && hasMessages"
      data-testid="chat-footer"
      class="duo-chat-drawer-footer gl-b-white gl-border-t gl-bg-gray-10 gl-p-5 gl-min-h-12"
      :class="{ 'duo-chat-drawer-body-scrim-on-footer': !scrolledToBottom }"
    >
      <gl-form data-testid="chat-prompt-form" @submit.stop.prevent="sendChatPrompt">
        <div class="gl-relative gl-max-w-full">
          <!--
            @slot For integrating `<gl-context-items-menu>` component if pinned-context should be available. The following scopedSlot properties are provided: `isOpen`, `onClose`, `setRef`, `focusPrompt`, which should be passed to the `<gl-context-items-menu>` component when rendering, e.g. `<template #context-items-menu="{ isOpen, onClose, setRef, focusPrompt }">` `<gl-duo-chat-context-item-menu :ref="setRef" :open="isOpen" @close="onClose" @focus-prompt="focusPrompt" ...`
          -->
          <slot
            name="context-items-menu"
            :is-open="contextItemsMenuIsOpen"
            :on-close="closeContextItemsMenuOpen"
            :set-ref="setContextItemsMenuRef"
            :focus-prompt="focusChatInput"
          ></slot>
        </div>

        <gl-form-input-group>
          <div
            class="duo-chat-input gl-h-8 gl-max-w-full gl-grow gl-rounded-base gl-bg-white gl-align-top gl-shadow-inner-1-gray-400"
            :data-value="prompt"
          >
            <gl-card
              v-if="shouldShowSlashCommands"
              ref="commands"
              class="slash-commands !gl-absolute gl-w-full -gl-translate-y-full gl-list-none gl-pl-0 gl-shadow-md"
              body-class="!gl-p-2"
            >
              <gl-dropdown-item
                v-for="(command, index) in filteredSlashCommands"
                :key="command.name"
                :class="{ 'active-command': index === activeCommandIndex }"
                @mouseenter.native="activeCommandIndex = index"
                @click="selectSlashCommand(index)"
              >
                <span class="gl-flex gl-justify-between">
                  <span class="gl-block">{{ command.name }}</span>
                  <small class="gl-pl-3 gl-text-right gl-italic gl-text-gray-500">{{
                    command.description
                  }}</small>
                </span>
              </gl-dropdown-item>
            </gl-card>

            <gl-form-textarea
              ref="prompt"
              v-model="prompt"
              data-testid="chat-prompt-input"
              class="gl-absolute !gl-h-full gl-rounded-br-none gl-rounded-tr-none !gl-bg-transparent !gl-py-4 !gl-shadow-none"
              :class="{ 'gl-truncate': !prompt }"
              :placeholder="inputPlaceholder"
              autofocus
              @keydown.enter.exact.native.prevent
              @keyup.native="onInputKeyup"
              @compositionend="compositionEnd"
            />
          </div>
          <template #append>
            <gl-button
              v-if="displaySubmitButton"
              icon="paper-airplane"
              category="primary"
              variant="confirm"
              class="!gl-absolute gl-bottom-2 gl-right-2 !gl-rounded-base"
              type="submit"
              data-testid="chat-prompt-submit-button"
              :aria-label="$options.i18n.CHAT_SUBMIT_LABEL"
            />
            <gl-button
              v-else
              icon="stop"
              category="primary"
              variant="default"
              class="!gl-absolute gl-bottom-2 gl-right-2 !gl-rounded-base"
              data-testid="chat-prompt-cancel-button"
              :aria-label="$options.i18n.CHAT_CANCEL_LABEL"
              @click="cancelPrompt"
            />
          </template>
        </gl-form-input-group>
      </gl-form>
    </footer>
  </aside>
</template>

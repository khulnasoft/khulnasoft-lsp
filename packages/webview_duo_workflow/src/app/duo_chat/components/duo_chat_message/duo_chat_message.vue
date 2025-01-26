<script>
import {
  GlIcon,
  GlLoadingIcon,
  GlTooltipDirective,
  GlFormGroup,
  GlFormTextarea,
  GlSafeHtmlDirective as SafeHtml,
} from '@khulnasoft/ui';
import { MESSAGE_MODEL_ROLES, SELECTED_CONTEXT_ITEMS_DEFAULT_COLLAPSED } from '../../constants';
import DocumentationSources from '../duo_chat_message_sources/duo_chat_message_sources.vue';
// eslint-disable-next-line no-restricted-imports
import { renderDuoChatMarkdownPreview } from '../../markdown_renderer';
import { CopyCodeElement } from './copy_code_element';
import { InsertCodeSnippetElement } from './insert_code_snippet_element';
import { concatUntilEmpty } from './utils';

export default {
  name: 'GlDuoChatMessage',
  safeHtmlConfigExtension: {
    ADD_TAGS: ['copy-code', 'insert-code-snippet'],
  },
  components: {
    DocumentationSources,
    GlFormGroup,
    GlFormTextarea,
    GlIcon,
    GlLoadingIcon,
  },
  directives: {
    SafeHtml,
    GlTooltip: GlTooltipDirective,
  },
  inject: {
    // Note, we likely might move away from Provide/Inject for this
    // and only ship the versions that are currently in the default
    // See https://gitlab.com/gitlab-org/gitlab-ui/-/merge_requests/3953#note_1762834219
    // for more context.
    renderGFM: {
      from: 'renderGFM',
      default: () => (element) => {
        element.classList.add('gl-markdown', 'gl-compact-markdown', 'gl-text-sm');
      },
    },
    renderMarkdown: {
      from: 'renderMarkdown',
      default: () => renderDuoChatMarkdownPreview,
    },
  },
  props: {
    /**
     * A message object
     */
    message: {
      type: Object,
      required: true,
    },
    isCancelled: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      didWhat: '',
      improveWhat: '',
      messageWatcher: null, // imperatively set up watcher on message
      messageChunks: [],
      selectedContextItemsDefaultCollapsed: SELECTED_CONTEXT_ITEMS_DEFAULT_COLLAPSED,
    };
  },
  computed: {
    isChunk() {
      return typeof this.message.chunkId === 'number';
    },
    isNotChunkOrCancelled() {
      return !this.isChunk || this.isCancelled;
    },
    isChunkAndNotCancelled() {
      return this.isChunk && !this.isCancelled;
    },
    isAssistantMessage() {
      return this.message.role.toLowerCase() === MESSAGE_MODEL_ROLES.assistant;
    },
    isUserMessage() {
      return this.message.role.toLowerCase() === MESSAGE_MODEL_ROLES.user;
    },
    sources() {
      return this.message.extras?.sources;
    },
    defaultContent() {
      if (this.message.contentHtml) {
        return this.message.contentHtml;
      }

      return this.renderMarkdown(this.message.content);
    },
    messageContent() {
      if (this.isAssistantMessage && this.isChunk) {
        return this.renderMarkdown(concatUntilEmpty(this.messageChunks));
      }

      return this.defaultContent || this.renderMarkdown(concatUntilEmpty(this.message.chunks));
    },
    renderedError() {
      return this.renderMarkdown(this.message.errors?.join('; ') || '');
    },
    error() {
      return Boolean(this.message?.errors?.length) && this.message.errors.join('; ');
    },
    selectedContextItems() {
      return this.message.extras?.contextItems || [];
    },
    displaySelectedContextItems() {
      return Boolean(this.selectedContextItems.length);
    },
    selectedContextItemsTitle() {
      if (!this.displaySelectedContextItems) return '';

      const count = this.selectedContextItems.length;

      if (this.isUserMessage) {
        return translatePlural(
          'GlDuoChatMessage.SelectedContextItemsTitleUserMessage',
          'Included reference',
          'Included references',
        )(count);
      }

      return sprintf(
        translatePlural(
          'GlDuoChatMessage.SelectedContextItemsTitleAssistantMessage',
          'Used %{count} included reference',
          'Used %{count} included references',
        )(count),
        {
          count,
        },
      );
    },
    shouldHighlightMessage() {
      return this.message.highlight;
    },
  },
  beforeCreate() {
    if (!customElements.get('copy-code')) {
      customElements.define('copy-code', CopyCodeElement);
    }
    if (!customElements.get('insert-code-snippet')) {
      customElements.define('insert-code-snippet', InsertCodeSnippetElement);
    }
  },
  mounted() {
    if (this.isAssistantMessage) {
      // The watcher has to be created imperatively here
      // to give an opportunity to remove it after
      // the complete message has arrived
      this.messageWatcher = this.$watch('message', this.manageMessageUpdate);
    }
    this.setChunks();
    this.hydrateContentWithGFM();
  },
  updated() {
    this.hydrateContentWithGFM();
  },
  methods: {
    setChunks() {
      if (this.isChunk) {
        const { chunkId, content } = this.message;
        this.$set(this.messageChunks, chunkId - 1, content);
      } else {
        this.messageChunks = [];
      }
    },
    stopWatchingMessage() {
      if (this.messageWatcher) {
        this.messageWatcher(); // Stop watching the message prop
        this.messageWatcher = null; // Ensure the watcher can't be stopped multiple times
      }
    },
    hydrateContentWithGFM() {
      if (!this.isChunk && this.$refs.content) {
        this.$nextTick(this.renderGFM(this.$refs.content, this.message.role));
      }
    },
    logEvent(e) {
      this.$emit('track-feedback', {
        ...e,
        didWhat: this.didWhat,
        improveWhat: this.improveWhat,
        message: this.message,
      });
    },
    manageMessageUpdate() {
      this.setChunks();
      if (!this.isChunk) {
        this.stopWatchingMessage();
      }
    },
    onInsertCodeSnippet(e) {
      this.$emit('insert-code-snippet', e);
    },
    onGetContextItemContent(contextItem) {
      this.$emit('get-context-item-content', {
        messageId: this.message.id,
        contextItem,
      });
    },
  },
};
</script>
<template>
  <div
    class="duo-chat-message gl-mb-4 gl-rounded-lg gl-leading-20 gl-break-anywhere"
    :class="{
      'gl-ml-auto gl-rounded-br-none gl-bg-blue-100 gl-text-blue-900 gl-p-4': isUserMessage,
      'gl-rounded-bl-none gl-border-1 gl-border-solid  gl-text-gray-900 gl-p-4': isAssistantMessage,
      'gl-bg-white gl-border-gray-50 gl-p-4':
        isAssistantMessage && !shouldHighlightMessage && !error,
      'gl-bg-orange-50 gl-border-orange-100 gl-p-4':
        isAssistantMessage && shouldHighlightMessage && !error,
      'gl-bg-red-50 gl-p-4': error,
    }"
    @insert-code-snippet="onInsertCodeSnippet"
  >
    <gl-icon
      v-if="error"
      name="status_warning_borderless"
      :size="16"
      class="error-icon gl-border gl-mr-3 gl-shrink-0 gl-rounded-full gl-border-red-500 gl-text-red-600"
      data-testid="error"
    />
    <div ref="content-wrapper" :class="{ 'has-error': error }">
      <div
        v-if="error"
        ref="error-message"
        v-safe-html:[$options.safeHtmlConfigExtension]="renderedError"
      ></div>
      <div v-else>
        <div ref="content" v-safe-html:[$options.safeHtmlConfigExtension]="messageContent"></div>

        <template v-if="isAssistantMessage">
          <documentation-sources v-if="sources" :sources="sources" />
        </template>
      </div>
    </div>
  </div>
</template>

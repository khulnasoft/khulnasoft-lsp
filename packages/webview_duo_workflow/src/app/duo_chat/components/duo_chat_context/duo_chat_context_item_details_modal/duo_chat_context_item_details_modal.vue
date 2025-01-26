<script>
import { nextTick } from 'vue';
import { contextItemValidator } from '../utils';
import GlModal from '../../../../../../base/modal/modal.vue';
import { SafeHtmlDirective as SafeHtml } from '../../../../../../../directives/safe_html/safe_html';
import GlSkeletonLoader from '../../../../../../base/skeleton_loader/skeleton_loader.vue';
import { translate } from '../../../../../../../utils/i18n';
import {
  CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
  LANGUAGE_IDENTIFIER_DIFF,
  LANGUAGE_IDENTIFIER_PLAINTEXT,
  LANGUAGE_IDENTIFIER_PREFIX,
} from '../constants';

export default {
  name: 'GlDuoChatContextItemDetailsModal',
  components: {
    GlSkeletonLoader,
    GlModal,
  },
  directives: {
    SafeHtml,
  },
  inject: {
    renderGFM: {
      from: 'renderGFM',
      default: () => (element) => {
        element.classList.add('gl-markdown', 'gl-compact-markdown');
      },
    },
  },
  props: {
    /**
     * Context items to preview. If it has no `content`, the loading state will be displayed.
     */
    contextItem: {
      type: Object,
      required: true,
      validator: contextItemValidator,
    },
  },
  computed: {
    isLoadingContent() {
      return this.contextItem.content === undefined;
    },
    languageIdentifierClass() {
      if (this.contextItem.category === CONTEXT_ITEM_CATEGORY_LOCAL_GIT) {
        return LANGUAGE_IDENTIFIER_DIFF;
      }

      const fileExtension = this.contextItem.metadata?.relativePath?.split('.').at(-1);
      if (fileExtension && fileExtension !== this.contextItem.metadata?.relativePath) {
        return `${LANGUAGE_IDENTIFIER_PREFIX}${fileExtension}`;
      }

      return LANGUAGE_IDENTIFIER_PLAINTEXT;
    },
    title() {
      return (
        this.contextItem.metadata?.title ||
        this.contextItem.metadata?.relativePath ||
        translate('GlDuoChatContextItemDetailsModal.title', 'Preview')
      );
    },
  },
  watch: {
    contextItem: {
      async handler(newVal, oldVal) {
        const shouldFormat = newVal?.content !== oldVal?.content && newVal?.content;
        if (shouldFormat) {
          await nextTick();
          await this.hydrateContentWithGFM();
        }
      },
      immediate: true,
    },
  },
  methods: {
    async hydrateContentWithGFM() {
      await nextTick();

      if (this.$refs.content) {
        this.renderGFM(this.$refs.content);
      }
    },
    onModalVisibilityChange(isVisible) {
      if (!isVisible) {
        this.$emit('close');
      }
    },
  },
};
</script>

<template>
  <gl-modal
    modal-id="context-item-details-modal"
    :title="title"
    :visible="true"
    :scrollable="true"
    hide-footer
    size="lg"
    @change="onModalVisibilityChange"
  >
    <gl-skeleton-loader v-if="isLoadingContent" />
    <div v-else ref="content" data-testid="context-item-content">
      <pre
        v-safe-html="contextItem.content"
        class="code js-syntax-highlight gl-p-3"
        :class="languageIdentifierClass"
      ></pre>
    </div>
  </gl-modal>
</template>

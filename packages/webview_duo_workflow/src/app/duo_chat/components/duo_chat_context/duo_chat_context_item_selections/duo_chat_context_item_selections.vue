<script>
import uniqueId from 'lodash/uniqueId';
import GlIcon from '../../../../../../base/icon/icon.vue';
import GlToken from '../../../../../../base/token/token.vue';
import GlTruncate from '../../../../../../utilities/truncate/truncate.vue';
import GlDuoChatContextItemPopover from '../duo_chat_context_item_popover/duo_chat_context_item_popover.vue';
import { CONTEXT_ITEM_CATEGORY_FILE, CONTEXT_ITEM_CATEGORY_LOCAL_GIT } from '../constants';
import GlDuoChatContextItemDetailsModal from '../duo_chat_context_item_details_modal/duo_chat_context_item_details_modal.vue';
import { contextItemsValidator, getContextItemIcon } from '../utils';

export default {
  name: 'GlDuoChatContextItemSelections',
  components: {
    GlTruncate,
    GlDuoChatContextItemDetailsModal,
    GlIcon,
    GlDuoChatContextItemPopover,
    GlToken,
  },
  props: {
    /**
     * Array of selected context items.
     */
    selections: {
      type: Array,
      required: true,
      validator: contextItemsValidator,
    },
    /**
     * The title to display for the selections.
     */
    title: {
      type: String,
      required: true,
    },
    /**
     * Whether the selections should be collapsed by default.
     */
    defaultCollapsed: {
      type: Boolean,
      required: true,
    },
    /**
     * Whether the selections can be removed.
     */
    removable: {
      type: Boolean,
      required: false,
      default: false,
    },
    variant: {
      type: String,
      required: false,
      default: 'assistant',
    },
  },
  data() {
    return {
      isCollapsed: this.defaultCollapsed,
      selectionsId: uniqueId(),
      previewContextItemId: null,
    };
  },
  computed: {
    collapseIconName() {
      return this.isCollapsed ? 'chevron-right' : 'chevron-down';
    },
    variantClasses() {
      if (this.variant === 'user') {
        return 'gl-mb-0 gl-mt-2 gl-text-blue-700';
      }
      return 'gl-mb-2 gl-text-gray-500';
    },
    tokenVariantClasses() {
      if (this.variant === 'user') {
        return 'gl-bg-blue-50 gl-text-blue-600';
      }
      return '';
    },
    contextItemPreview() {
      return this.selections.find((item) => item.id === this.previewContextItemId);
    },
  },
  methods: {
    getContextItemIcon,
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    },
    onRemoveItem(contextItem) {
      /**
       * Emitted when a context contextItem should be removed.
       * @property {Object} item - The context contextItem to be removed
       */
      this.$emit('remove', contextItem);
    },
    onOpenItem(event, contextItem) {
      const isKeypressOnCloseButton =
        event.type === 'keydown' && event.target !== event.currentTarget;
      if (isKeypressOnCloseButton) {
        // don't respond to events triggered by the gl-token children (e.g. the close button)
        return;
      }

      if (!this.canOpen(contextItem)) {
        return;
      }
      if (!contextItem.content) {
        this.$emit('get-content', contextItem);
      }
      this.previewContextItemId = contextItem.id;
    },
    canOpen(contextItem) {
      return [CONTEXT_ITEM_CATEGORY_LOCAL_GIT, CONTEXT_ITEM_CATEGORY_FILE].includes(
        contextItem.category
      );
    },
    onClosePreview() {
      this.previewContextItemId = null;
    },
  },
};
</script>

<template>
  <div class="gl-flex gl-flex-col" :class="variantClasses">
    <button
      class="gl-flex gl-w-full gl-items-center gl-border-0 gl-bg-transparent gl-p-0 gl-text-left gl-text-xs gl-lowercase gl-text-inherit"
      data-testid="chat-context-selections-title"
      type="button"
      @click="toggleCollapse"
    >
      <gl-icon :name="collapseIconName" data-testid="chat-context-collapse-icon" /> {{ title }}
    </button>

    <div
      v-show="!isCollapsed"
      class="gl-mt-1 gl-flex gl-grow gl-flex-wrap"
      data-testid="chat-context-tokens-wrapper"
    >
      <gl-token
        v-for="item in selections"
        :id="`context-item-${item.id}-${selectionsId}-token`"
        :key="item.id"
        :view-only="!removable"
        variant="default"
        class="gl-mb-2 gl-mr-2 gl-max-w-full"
        :class="tokenVariantClasses"
        :tabindex="canOpen(item) ? 0 : -1"
        :role="canOpen(item) ? 'button' : undefined"
        @click="onOpenItem($event, item)"
        @keydown.enter="onOpenItem($event, item)"
        @keydown.space.prevent="onOpenItem($event, item)"
        @close="onRemoveItem(item)"
      >
        <div
          :id="`context-item-${item.id}-${selectionsId}`"
          class="gl-flex gl-min-w-0 gl-items-center"
        >
          <gl-icon
            v-if="getContextItemIcon(item)"
            :name="getContextItemIcon(item)"
            :size="12"
            class="gl-mr-1"
          />
          <gl-truncate :text="item.metadata.title" position="middle" />
        </div>
        <gl-duo-chat-context-item-popover
          :context-item="item"
          :target="`context-item-${item.id}-${selectionsId}-token`"
          placement="bottom"
          @show-git-diff="onOpenItem(item)"
        />
      </gl-token>
    </div>
    <gl-duo-chat-context-item-details-modal
      v-if="contextItemPreview"
      :context-item="contextItemPreview"
      @close="onClosePreview"
    />
  </div>
</template>

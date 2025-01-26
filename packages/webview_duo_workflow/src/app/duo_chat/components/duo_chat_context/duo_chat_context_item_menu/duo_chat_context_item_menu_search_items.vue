<script>
import GlDropdownItem from '../../../../../../base/dropdown/dropdown_item.vue';
import GlFormInput from '../../../../../../base/form/form_input/form_input.vue';
import GlAlert from '../../../../../../base/alert/alert.vue';
import { sprintf, translate } from '../../../../../../../utils/i18n';
import { categoryValidator, contextItemsValidator } from '../utils';
import GlDuoChatContextItemMenuSearchItemsLoading from './duo_chat_context_item_menu_search_items_loading.vue';
import GlDuoChatContextItemMenuSearchItem from './duo_chat_context_item_menu_search_item.vue';

export default {
  name: 'GlDuoChatContextItemMenuSearchItems',
  components: {
    GlAlert,
    GlDropdownItem,
    GlDuoChatContextItemMenuSearchItem,
    GlDuoChatContextItemMenuSearchItemsLoading,
    GlFormInput,
  },
  model: {
    prop: 'searchQuery',
    event: 'update:searchQuery',
  },
  props: {
    activeIndex: {
      type: Number,
      required: true,
    },
    searchQuery: {
      type: String,
      required: true,
    },
    category: {
      type: Object,
      required: true,
      validator: categoryValidator,
    },
    loading: {
      type: Boolean,
      required: true,
    },
    error: {
      type: [String, null],
      required: false,
      default: null,
    },
    results: {
      type: Array,
      required: true,
      validator: contextItemsValidator,
    },
  },
  data() {
    return {
      userInitiatedSearch: false,
      numLoadingItems: 3,
    };
  },
  computed: {
    showEmptyState() {
      return Boolean(
        this.userInitiatedSearch && !this.loading && !this.error && !this.results.length
      );
    },
    searchInputPlaceholder() {
      return sprintf(
        translate('GlDuoChatContextItemMenu.searchInputPlaceholder', 'Search %{categoryLabel}...'),
        {
          categoryLabel: this.category.label.toLowerCase(),
        }
      );
    },
  },
  watch: {
    searchQuery() {
      this.userInitiatedSearch = true;
    },
    results(results) {
      this.numLoadingItems = Math.max(1, results.length);
    },
  },
  methods: {
    selectItem(contextItem) {
      this.$emit('select', contextItem);
      this.userInitiatedSearch = false;
    },
    handleKeyUp(e) {
      this.$emit('keyup', e);
    },
    setActiveIndex(index) {
      if (this.results[index]?.metadata.enabled) {
        this.$emit('active-index-change', index);
      }
    },
    isActiveItem(contextItem, index) {
      return index === this.activeIndex && contextItem.metadata.enabled;
    },
  },
  i18n: {
    emptyStateMessage: translate('GlDuoChatContextItemMenu.emptyStateMessage', 'No results found'),
  },
};
</script>
<template>
  <div>
    <div class="gl-max-h-31 gl-overflow-y-scroll">
      <gl-duo-chat-context-item-menu-search-items-loading v-if="loading" :rows="numLoadingItems" />
      <gl-alert
        v-else-if="error"
        variant="danger"
        :dismissible="false"
        class="gl-m-3"
        data-testid="search-results-error"
      >
        {{ error }}
      </gl-alert>
      <div
        v-else-if="showEmptyState"
        class="gl-rounded-base gl-p-3 gl-text-center gl-text-secondary"
        data-testid="search-results-empty-state"
      >
        {{ $options.i18n.emptyStateMessage }}
      </div>
      <ul v-else class="gl-mb-1 gl-list-none gl-flex-row gl-pl-0">
        <gl-dropdown-item
          v-for="(contextItem, index) in results"
          :id="`dropdown-item-${index}`"
          :key="contextItem.id"
          :class="{
            'active-command': isActiveItem(contextItem, index),
            'gl-cursor-not-allowed [&>button]:focus-within:!gl-shadow-none':
              !contextItem.metadata.enabled,
          }"
          :tabindex="!contextItem.metadata.enabled ? -1 : undefined"
          class="duo-chat-context-search-result-item"
          data-testid="search-result-item"
          @click="selectItem(contextItem)"
        >
          <div @mouseenter="setActiveIndex(index)">
            <gl-duo-chat-context-item-menu-search-item
              :context-item="contextItem"
              :category="category"
              :class="{ 'gl-text-secondary': !contextItem.metadata.enabled }"
              data-testid="search-result-item-details"
            />
          </div>
        </gl-dropdown-item>
      </ul>
    </div>
    <gl-form-input
      ref="contextMenuSearchInput"
      :value="searchQuery"
      :placeholder="searchInputPlaceholder"
      autofocus
      data-testid="context-menu-search-input"
      @input="$emit('update:searchQuery', $event)"
      @keyup="handleKeyUp"
    />
  </div>
</template>

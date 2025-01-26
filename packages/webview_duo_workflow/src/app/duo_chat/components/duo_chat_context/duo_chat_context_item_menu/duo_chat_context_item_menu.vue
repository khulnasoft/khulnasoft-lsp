<script>
import debounce from 'lodash/debounce';
import { translate } from '../../../../../../../utils/i18n';
import GlCard from '../../../../../../base/card/card.vue';
import GlDuoChatContextItemSelections from '../duo_chat_context_item_selections/duo_chat_context_item_selections.vue';
import { categoriesValidator, contextItemsValidator, wrapIndex } from '../utils';
import GlDuoChatContextItemMenuCategoryItems from './duo_chat_context_item_menu_category_items.vue';
import GlDuoChatContextItemMenuSearchItems from './duo_chat_context_item_menu_search_items.vue';

const SEARCH_DEBOUNCE_MS = 30;

export default {
  name: 'GlDuoChatContextItemMenu',
  components: {
    GlCard,
    GlDuoChatContextItemMenuCategoryItems,
    GlDuoChatContextItemMenuSearchItems,
    GlDuoChatContextItemSelections,
  },
  props: {
    /**
     * Whether the menu is open.
     */
    open: {
      type: Boolean,
      required: true,
    },
    /**
     * Array of selected context items.
     */
    selections: {
      type: Array,
      required: true,
      validator: contextItemsValidator,
    },
    /**
     * Whether the menu is in a loading state.
     */
    loading: {
      type: Boolean,
      required: true,
    },
    /**
     * Error message to display, if any.
     */
    error: {
      type: [String, null],
      required: false,
      default: null,
    },
    /**
     * Array of available categories for context items.
     */
    categories: {
      type: Array,
      required: true,
      validator: categoriesValidator,
    },
    /**
     * Array of search results for context items.
     */
    results: {
      type: Array,
      required: true,
      validator: contextItemsValidator,
    },
  },
  data() {
    return {
      selectedCategory: null,
      searchQuery: '',
      activeIndex: 0,
    };
  },
  computed: {
    showCategorySelection() {
      return this.open && !this.selectedCategory;
    },
    allResultsAreDisabled() {
      return this.results.every((result) => !result.metadata.enabled);
    },
  },
  watch: {
    open(isOpen) {
      if (!isOpen) {
        this.resetSelection();
      }
    },
    searchQuery(query) {
      this.debouncedSearch(query);
    },
    results(newResults) {
      const firstEnabledIndex = newResults.findIndex((result) => result.metadata.enabled);
      this.activeIndex = firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
    },
  },
  methods: {
    selectCategory(category) {
      this.searchQuery = '';
      this.selectedCategory = category;

      this.$emit('search', {
        category: category.value,
        query: '',
      });
    },
    debouncedSearch: debounce(function search(query) {
      /**
       * Emitted when a search should be performed.
       * @property {Object} filter
       * @property {string} filter.category - The value of the selected category
       * @property {string} filter.query - The search query
       */
      this.$emit('search', {
        category: this.selectedCategory.value,
        query,
      });
    }, SEARCH_DEBOUNCE_MS),
    selectItem(item) {
      if (!item.metadata.enabled) {
        return;
      }

      /**
       * Emitted when a context item is selected.
       * @property {Object} item - The selected context item
       */
      this.$emit(
        'select',
        this.results.find((result) => result.id === item.id)
      );

      /**
       * Emitted when the menu should be closed.
       */
      this.$emit('close');
      this.resetSelection();
    },
    removeItem(item) {
      /**
       * Emitted when a context item should be removed.
       * @property {Object} item - The context item to be removed
       */
      this.$emit('remove', item);
    },
    resetSelection() {
      this.selectedCategory = null;
      this.searchQuery = '';
      this.activeIndex = 0;
    },
    async scrollActiveItemIntoView() {
      await this.$nextTick();

      const activeItem = document.getElementById(`dropdown-item-${this.activeIndex}`);
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', inline: 'start' });
      }
    },
    handleKeyUp(e) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
          e.preventDefault();
          this.moveActiveIndex(e.key === 'ArrowDown' ? 1 : -1);
          this.scrollActiveItemIntoView();
          break;
        case 'Enter':
          e.preventDefault();
          if (this.showCategorySelection) {
            this.selectCategory(this.categories[this.activeIndex]);
            return;
          }
          if (!this.results.length) {
            return;
          }
          this.selectItem(this.results[this.activeIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          if (this.showCategorySelection) {
            this.$emit('close');
            return;
          }

          this.selectedCategory = null;

          /**
           * Emitted when the parent GlDuoChat component should refocus on the main prompt input
           */
          this.$emit('focus-prompt');
          break;
        default:
          break;
      }
    },
    moveActiveIndex(step) {
      if (this.showCategorySelection) {
        // Categories cannot be disabled, so just loop to the next/prev one
        this.activeIndex = wrapIndex(this.activeIndex, step, this.categories.length);
        return;
      }

      // Return early if there are no results or all results are disabled
      if (!this.results.length || this.allResultsAreDisabled) {
        return;
      }

      // contextItems CAN be disabled, so loop to next/prev but ensure we don't land on a disabled one
      let newIndex = this.activeIndex;
      do {
        newIndex = wrapIndex(newIndex, step, this.results.length);

        if (newIndex === this.activeIndex) {
          // If we've looped through all items and found no enabled ones, keep the current index
          return;
        }
      } while (!this.results[newIndex].metadata.enabled);

      this.activeIndex = newIndex;
    },
    onGetContextItemContent(contextItem) {
      /**
       * Emit get-context-item-content event that tells clients to load the full file content for a selected context item.
       * The fully hydrated context item should be updated in the context item selections.
       * @param {*} event An event containing the context item to hydrate
       */
      this.$emit('get-context-item-content', { contextItem });
    },
  },
  i18n: {
    selectedContextItemsTitle: translate(
      'GlDuoChatContextItemMenu.selectedContextItemsTitle',
      'Included references'
    ),
  },
};
</script>

<template>
  <div>
    <gl-duo-chat-context-item-selections
      v-if="selections.length"
      :selections="selections"
      :categories="categories"
      :removable="true"
      :title="$options.i18n.selectedContextItemsTitle"
      :default-collapsed="false"
      class="gl-mb-3"
      @remove="removeItem"
      @get-content="onGetContextItemContent"
    />
    <gl-card
      v-if="open"
      class="slash-commands !gl-absolute gl-bottom-0 gl-w-full gl-pl-0 gl-shadow-md"
      body-class="!gl-p-2"
      data-testid="context-item-menu"
    >
      <gl-duo-chat-context-item-menu-category-items
        v-if="showCategorySelection"
        :active-index="activeIndex"
        :categories="categories"
        @select="selectCategory"
        @active-index-change="activeIndex = $event"
      />
      <gl-duo-chat-context-item-menu-search-items
        v-else
        v-model="searchQuery"
        :active-index="activeIndex"
        :category="selectedCategory"
        :loading="loading"
        :error="error"
        :results="results"
        @select="selectItem"
        @keyup="handleKeyUp"
        @active-index-change="activeIndex = $event"
      />
    </gl-card>
  </div>
</template>

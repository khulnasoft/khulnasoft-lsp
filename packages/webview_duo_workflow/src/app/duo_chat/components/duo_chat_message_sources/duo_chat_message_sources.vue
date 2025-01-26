<script>
import { GlIcon, GlLink } from '@khulnasoft/ui';
import { DOCUMENTATION_SOURCE_TYPES } from '../../constants';

export const i18n = {
  MESSAGE_SOURCE: 'Source',
};

export default {
  name: 'GlDuoChatMessageSources',
  components: {
    GlIcon,
    GlLink,
  },
  props: {
    /**
     * The Array of the message sources.
     */
    sources: {
      type: Array,
      required: true,
    },
  },
  computed: {
    sourceLabel() {
      return i18n.MESSAGE_SOURCE;
    },
  },
  methods: {
    getSourceIcon(sourceType) {
      const currentSourceType = Object.values(DOCUMENTATION_SOURCE_TYPES).find(
        ({ value }) => value === sourceType,
      );

      return currentSourceType?.icon || 'document';
    },
    getSourceTitle({ title, source_type: sourceType, stage, group, date, author }) {
      if (title) {
        return title;
      }

      if (sourceType === DOCUMENTATION_SOURCE_TYPES.DOC.value) {
        if (stage && group) {
          return `${stage} / ${group}`;
        }
      }

      if (sourceType === DOCUMENTATION_SOURCE_TYPES.BLOG.value) {
        if (date && author) {
          return `${date} / ${author}`;
        }
      }

      return this.sourceLabel;
    },
  },
};
</script>
<template>
  <div class="gl-mr-3 gl-mt-4 gl-text-gray-600" data-testid="duo-chat-message-sources">
    <span v-if="sources.length">{{ sourceLabel }}:</span>

    <ul class="gl-m-0 gl-list-none gl-p-0">
      <li
        v-for="(source, index) in sources"
        :key="index"
        class="gl-flex gl-items-center gl-pt-3"
        data-testid="source-list-item"
      >
        <gl-icon
          v-if="source.source_type"
          :name="getSourceIcon(source.source_type)"
          class="gl-mr-2 gl-shrink-0"
        />
        <gl-link :href="source.source_url">{{ getSourceTitle(source) }}</gl-link>
      </li>
    </ul>
  </div>
</template>

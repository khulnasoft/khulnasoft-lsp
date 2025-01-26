<script>
import GlAlert from '../../../../../../base/alert/alert.vue';
import GlIcon from '../../../../../../base/icon/icon.vue';
import GlPopover from '../../../../../../base/popover/popover.vue';
import GlTruncate from '../../../../../../utilities/truncate/truncate.vue';
import { translate } from '../../../../../../../utils/i18n';
import {
  CONTEXT_ITEM_CATEGORY_FILE,
  CONTEXT_ITEM_CATEGORY_ISSUE,
  CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
  CONTEXT_ITEM_CATEGORY_MERGE_REQUEST,
} from '../constants';
import {
  formatGitItemSecondaryText,
  formatIssueId,
  formatMergeRequestId,
  getContextItemIcon,
  getContextItemTypeLabel,
} from '../utils';

export default {
  name: 'DuoChatContextItemPopover',
  components: {
    GlTruncate,
    GlAlert,
    GlIcon,
    GlPopover,
  },
  props: {
    /**
     * The context contextItem to display in the popover.
     */
    contextItem: {
      type: Object,
      required: true,
    },
    /**
     * The target element ID for the popover.
     */
    target: {
      type: String,
      required: true,
    },
    /**
     * The placement of the popover relative to the target.
     */
    placement: {
      type: String,
      default: 'bottom',
      required: false,
    },
  },
  computed: {
    id() {
      const isIssuable =
        this.contextItem.category === CONTEXT_ITEM_CATEGORY_ISSUE ||
        this.contextItem.category === CONTEXT_ITEM_CATEGORY_MERGE_REQUEST;
      return isIssuable ? this.contextItem.metadata.iid : null;
    },
    formattedId() {
      switch (this.contextItem.category) {
        case CONTEXT_ITEM_CATEGORY_ISSUE:
          return formatIssueId(this.id);
        case CONTEXT_ITEM_CATEGORY_MERGE_REQUEST:
          return formatMergeRequestId(this.id);
        default:
          return '';
      }
    },
    title() {
      return this.contextItem.metadata.title || '';
    },
    filePath() {
      return this.contextItem.category === CONTEXT_ITEM_CATEGORY_FILE
        ? this.contextItem.metadata.relativePath || ''
        : null;
    },
    filePathArray() {
      return this.filePath?.split('/');
    },
    gitDetails() {
      return this.contextItem.category === CONTEXT_ITEM_CATEGORY_LOCAL_GIT
        ? formatGitItemSecondaryText(this.contextItem)
        : null;
    },
    isEnabled() {
      return this.contextItem.metadata.enabled !== false;
    },
    disabledMessage() {
      return Array.isArray(this.contextItem.metadata.disabledReasons) &&
        this.contextItem.metadata.disabledReasons.length > 0
        ? this.contextItem.metadata.disabledReasons.join(', ')
        : translate('DuoChatContextItemPopover.DisabledReason', 'This item is disabled');
    },
    iconName() {
      return getContextItemIcon(this.contextItem);
    },
    itemTypeLabel() {
      return getContextItemTypeLabel(this.contextItem);
    },
  },
  methods: {
    translate,
  },
};
</script>
<template>
  <gl-popover
    :target="target"
    triggers="hover focus"
    :placement="placement"
    :title="title"
    custom-class="gl-duo-chat-item-popover"
  >
    <template #title>
      <div>
        <div
          class="gl-heading-3 gl-mb-1 gl-mt-2 gl-leading-1"
          data-testid="chat-context-popover-title"
        >
          {{ title }}
        </div>
        <div v-if="itemTypeLabel" class="gl-font-normal gl-text-subtle">{{ itemTypeLabel }}</div>
      </div>
    </template>
    <div>
      <div v-if="filePath">
        <gl-icon name="document" :size="12" variant="subtle" />
        <span class="gl-break-all">{{ contextItem.metadata.project }}</span>
        <span v-for="(pathPart, index) in filePathArray" :key="pathPart" class="gl-break-all"
          >{{ pathPart }}{{ index + 1 < filePathArray.length ? '/' : '' }}</span
        >
      </div>
      <div v-else-if="gitDetails" class="gl-flex gl-items-center" data-testid="git-details">
        <gl-icon :name="iconName" :size="12" variant="subtle" class="gl-mr-1 gl-shrink-0" />
        <gl-truncate :text="gitDetails" class="gl-min-w-0" />
      </div>
      <div v-else>
        <gl-icon v-if="iconName" :name="iconName" :size="12" variant="subtle" />
        <span class="gl-break-all">{{ contextItem.metadata.project }}</span>
        <span v-if="id" class="gl-break-all">{{ formattedId }}</span>
      </div>
      <gl-alert
        v-if="!isEnabled"
        variant="danger"
        class="gl-mb-1 gl-mt-3 gl-p-4 gl-text-sm"
        data-testid="chat-context-popover-disabled"
        :dismissible="false"
        :show-icon="false"
      >
        {{ disabledMessage }}
      </gl-alert>
    </div>
  </gl-popover>
</template>

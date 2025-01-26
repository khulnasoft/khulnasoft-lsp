import { translate } from '../../i18n.js';
import {
  CONTEXT_ITEM_CATEGORY_FILE,
  CONTEXT_ITEM_CATEGORY_ISSUE,
  CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
  CONTEXT_ITEM_CATEGORY_MERGE_REQUEST,
  CONTEXT_ITEM_LOCAL_GIT_COMMIT,
  CONTEXT_ITEM_LOCAL_GIT_DIFF,
} from './constants';

export function categoryValidator(category) {
  return Boolean(category && category.value && category.label && category.icon);
}

export function categoriesValidator(categories) {
  return Array.isArray(categories) && categories.every((category) => categoryValidator(category));
}

function disabledReasonsValidator(disabledReasons) {
  return (
    disabledReasons === undefined ||
    (Array.isArray(disabledReasons) &&
      disabledReasons.every((reason) => typeof reason === 'string'))
  );
}

export function contextItemValidator(item) {
  return Boolean(
    item &&
      item.id &&
      item.category &&
      item.metadata &&
      typeof item.metadata === 'object' &&
      typeof item.metadata.enabled === 'boolean' &&
      disabledReasonsValidator(item.metadata.disabledReasons),
  );
}

export function contextItemsValidator(items) {
  return Array.isArray(items) && items.every((item) => contextItemValidator(item));
}

export function formatIssueId(iid) {
  if (!iid) return '';

  return `#${iid}`;
}

export function formatMergeRequestId(iid) {
  if (!iid) return '';

  return `!${iid}`;
}

function getGitItemIcon(contextItem) {
  const iconMap = {
    [CONTEXT_ITEM_LOCAL_GIT_COMMIT]: 'commit',
    [CONTEXT_ITEM_LOCAL_GIT_DIFF]: 'comparison',
  };
  const { gitType } = contextItem.metadata;
  return iconMap[gitType] || null;
}

/**
 * Gets the icon name for a given contextItem.
 */
export function getContextItemIcon(contextItem, category = { icon: null }) {
  if (contextItem.category === CONTEXT_ITEM_CATEGORY_LOCAL_GIT) {
    const gitIcon = getGitItemIcon(contextItem);
    if (gitIcon) return gitIcon;
  }

  if (category.icon) {
    return category.icon;
  }

  const iconMap = {
    [CONTEXT_ITEM_CATEGORY_FILE]: 'document',
    [CONTEXT_ITEM_CATEGORY_ISSUE]: 'issues',
    [CONTEXT_ITEM_CATEGORY_MERGE_REQUEST]: 'merge-request',
    [CONTEXT_ITEM_CATEGORY_LOCAL_GIT]: 'git',
  };

  return iconMap[contextItem.category] || null;
}

export function getContextItemTypeLabel(contextItem) {
  if (contextItem.category === CONTEXT_ITEM_CATEGORY_LOCAL_GIT) {
    switch (contextItem.metadata.gitType) {
      case CONTEXT_ITEM_LOCAL_GIT_DIFF:
        return translate('DuoChatContextItemTypeLabel.GitDiff', 'Local Git repository diff');
      case CONTEXT_ITEM_LOCAL_GIT_COMMIT:
        return translate('DuoChatContextItemTypeLabel.GitCommit', 'Local Git repository commit');
      default:
        return translate('DuoChatContextItemTypeLabel.GitDefault', 'Local Git repository');
    }
  }

  switch (contextItem.category) {
    case CONTEXT_ITEM_CATEGORY_MERGE_REQUEST:
      return translate('DuoChatContextItemTypeLabel.MergeRequest', 'Merge request');
    case CONTEXT_ITEM_CATEGORY_ISSUE:
      return translate('DuoChatContextItemTypeLabel.Issue', 'Issue');
    case CONTEXT_ITEM_CATEGORY_FILE:
      return translate('DuoChatContextItemTypeLabel.File', 'Project file');
    default:
      return '';
  }
}

/**
 * Gets the secondary text line for a git context item, showing repository and commit ID
 */
export function formatGitItemSecondaryText(contextItem) {
  const { repositoryName, commitId } = contextItem.metadata;
  const separator = commitId ? ' - ' : '';
  return `${repositoryName}${separator}${commitId || ''}`;
}

/**
 * Calculates a new index within a range. If the new index would fall out of bounds, wraps to the start/end of the range.
 * @param {number} currentIndex - The starting index.
 * @param {number} step - The number of steps to move (positive or negative).
 * @param {number} totalLength - The total number of items in the range.
 * @returns {number} The new index.
 */
export function wrapIndex(currentIndex, step, totalLength) {
  return (currentIndex + step + totalLength) % totalLength;
}

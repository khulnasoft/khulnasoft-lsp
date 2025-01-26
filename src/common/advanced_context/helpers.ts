import { ConfigService } from '../config_service';
import { FeatureFlagService, InstanceFeatureFlags } from '../feature_flags';

/**
 * This is the maximum byte size of the content that can be sent to the Code Suggestions API.
 * This includes the content of the document and the context resolutions.
 */
export const CODE_SUGGESTIONS_REQUEST_BYTE_SIZE_LIMIT = 50000; // 50KB

/**
 * Determines if the advanced context resolver should be used for code suggestions.
 * Because the Code Suggestions API has other consumers than the language server,
 * we gate the advanced context resolver behind a feature flag separately.
 */
export const shouldUseAdvancedContext = (
  featureFlagService: FeatureFlagService,
  configService: ConfigService,
) => {
  const isEditorAdvancedContextEnabled = featureFlagService.isInstanceFlagEnabled(
    InstanceFeatureFlags.EditorAdvancedContext,
  );
  const isGenericContextEnabled = featureFlagService.isInstanceFlagEnabled(
    InstanceFeatureFlags.CodeSuggestionsContext,
  );
  let isEditorOpenTabsContextEnabled = configService.get('client.openTabsContext');

  if (isEditorOpenTabsContextEnabled === undefined) {
    isEditorOpenTabsContextEnabled = true;
  }
  /**
   * TODO - when we introduce other context resolution strategies,
   * have `isEditorOpenTabsContextEnabled` only disable the corresponding resolver (`lruResolver`)
   * https://github.com/khulnasoft/khulnasoft-lsp/-/issues/298
   * https://gitlab.com/groups/gitlab-org/editor-extensions/-/epics/59#note_1981542181
   */

  return (
    isEditorAdvancedContextEnabled && isGenericContextEnabled && isEditorOpenTabsContextEnabled
  );
};

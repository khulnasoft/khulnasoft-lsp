import { FeatureFlagService, InstanceFeatureFlags } from '../feature_flags';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { ConfigService } from '../config_service';
import { shouldUseAdvancedContext } from './helpers';

describe('shouldUseAdvancedContext', () => {
  const featureFlagService = createFakePartial<FeatureFlagService>({
    isInstanceFlagEnabled: jest.fn(),
  });
  const configService = createFakePartial<ConfigService>({
    get: jest.fn(),
  });

  describe.each`
    isEditorAdvancedContextEnabled | isGenericContextEnabled | isEditorOpenTabsContextEnabled | expected
    ${true}                        | ${true}                 | ${true}                        | ${true}
    ${true}                        | ${true}                 | ${undefined}                   | ${true}
    ${false}                       | ${true}                 | ${false}                       | ${false}
    ${true}                        | ${false}                | ${false}                       | ${false}
    ${false}                       | ${false}                | ${true}                        | ${false}
    ${false}                       | ${false}                | ${false}                       | ${false}
  `(
    'when EditorAdvancedContext feature flag is "$isEditorAdvancedContextEnabled" and CodeSuggestionsContext feature flag is "$isGenericContextEnabled" and EditorOpenTabsContext is "$isEditorOpenTabsContextEnabled"',
    ({
      isEditorAdvancedContextEnabled,
      isGenericContextEnabled,
      isEditorOpenTabsContextEnabled,
      expected,
    }) => {
      it(`should return ${expected}`, () => {
        jest.mocked(featureFlagService.isInstanceFlagEnabled).mockImplementation((flag) => {
          switch (flag) {
            case InstanceFeatureFlags.EditorAdvancedContext:
              return isEditorAdvancedContextEnabled;
            case InstanceFeatureFlags.CodeSuggestionsContext:
              return isGenericContextEnabled;
            default:
              return false;
          }
        });
        jest.mocked(configService.get).mockImplementation((key) => {
          switch (key) {
            case 'client.openTabsContext':
              return isEditorOpenTabsContextEnabled;
            default:
              return true;
          }
        });
        expect(shouldUseAdvancedContext(featureFlagService, configService)).toBe(expected);
      });
    },
  );
});

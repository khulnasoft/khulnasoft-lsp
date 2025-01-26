import { createFakePartial } from '../test_utils/create_fake_partial';
import { DefaultFeatureStateManager } from './feature_state_manager';
import { CodeSuggestionsSupportedLanguageCheck } from './supported_language_check';
import {
  AUTHENTICATION,
  AUTHENTICATION_REQUIRED,
  CHAT,
  CHAT_DISABLED_BY_USER,
  CHAT_NO_LICENSE,
  CODE_SUGGESTIONS,
  DUO_DISABLED_FOR_PROJECT,
  FeatureState,
  SUGGESTIONS_DISABLED_BY_USER,
  SUGGESTIONS_NO_LICENSE,
  UNSUPPORTED_KHULNASOFT_VERSION,
  UNSUPPORTED_LANGUAGE,
  DISABLED_LANGUAGE,
  AUTHENTICATION_CHECK_PRIORITY_ORDERED,
  CODE_SUGGESTIONS_CHECKS_PRIORITY_ORDERED,
  CHAT_CHECKS_PRIORITY_ORDERED,
  SUGGESTIONS_API_ERROR,
  StateCheckId,
} from './feature_state_management_types';
import { ProjectDuoAccessCheck } from './project_duo_acces_check';
import { CodeSuggestionsDuoLicenseCheck } from './code_suggestions_duo_license_check';
import { CodeSuggestionsInstanceVersionCheck } from './minimal_gitlab_version_for_code_suggestions_check';
import { ChatEnabledCheck } from './chat_enabled_check';
import { CodeSuggestionsEnabledCheck } from './code_suggestions_enabled_check';
import { DuoChatLicenseCheck } from './duo_chat_license_check';
import { AuthenticationRequiredCheck } from './authentication_required_check';
import { SuggestionApiErrorCheck } from './suggestion_api_error_check';

describe('CodeSuggestionStateManager', () => {
  const mockSupportedLanguageCheckInit = jest.fn().mockResolvedValue({});
  const mockDuoProjectAccessCheckInit = jest.fn().mockResolvedValue({});
  let languageCheckEngaged = true;
  let duoProjectAccessCheckEngaged = false;
  let authenticationRequiredCheckEngaged = false;

  const mockSendNotification = jest.fn();
  const checkChangeHandlers = new Map<StateCheckId, () => void>();
  const createMockOnChanged = (checkId: StateCheckId) =>
    jest.fn().mockImplementation((callback: () => void) => {
      checkChangeHandlers.set(checkId, callback);
    });

  beforeEach(async () => {
    const supportedLanguageCheck = createFakePartial<CodeSuggestionsSupportedLanguageCheck>({
      get engaged() {
        return languageCheckEngaged;
      },
      id: UNSUPPORTED_LANGUAGE,
      details: 'Language is not supported',
      onChanged: createMockOnChanged(UNSUPPORTED_LANGUAGE),
      init: mockSupportedLanguageCheckInit,
    });

    const suggestionApiErrorCheck = createFakePartial<SuggestionApiErrorCheck>({
      get engaged() {
        return false;
      },
      id: SUGGESTIONS_API_ERROR,
      details: 'Suggestion API Error Check',
      onChanged: createMockOnChanged(SUGGESTIONS_API_ERROR),
    });

    const duoProjectAccessCheck = createFakePartial<ProjectDuoAccessCheck>({
      get engaged() {
        return duoProjectAccessCheckEngaged;
      },
      id: DUO_DISABLED_FOR_PROJECT,
      details: 'DUO is disabled for this project.',
      onChanged: createMockOnChanged(DUO_DISABLED_FOR_PROJECT),
      init: mockDuoProjectAccessCheckInit,
    });

    const licenseAvailableCheck = createFakePartial<CodeSuggestionsDuoLicenseCheck>({
      get engaged() {
        return false;
      },
      id: SUGGESTIONS_NO_LICENSE,
      details: 'No license',
      onChanged: createMockOnChanged(SUGGESTIONS_NO_LICENSE),
    });

    const chatLicenseAvailableCheck = createFakePartial<DuoChatLicenseCheck>({
      get engaged() {
        return false;
      },
      id: CHAT_NO_LICENSE,
      details: 'No chat license',
      onChanged: createMockOnChanged(CHAT_NO_LICENSE),
    });

    const minInstanceVersionCheck = createFakePartial<CodeSuggestionsInstanceVersionCheck>({
      get engaged() {
        return false;
      },
      id: UNSUPPORTED_KHULNASOFT_VERSION,
      details: 'KhulnaSoft Duo Code Suggestions requires KhulnaSoft version 16.8 or later',
      onChanged: createMockOnChanged(UNSUPPORTED_KHULNASOFT_VERSION),
    });

    const chatEnabledCheck = createFakePartial<ChatEnabledCheck>({
      get engaged() {
        return false;
      },
      id: CHAT_DISABLED_BY_USER,
      onChanged: createMockOnChanged(CHAT_DISABLED_BY_USER),
    });

    const codeSuggestionEnabledCheck = createFakePartial<CodeSuggestionsEnabledCheck>({
      get engaged() {
        return false;
      },
      id: SUGGESTIONS_DISABLED_BY_USER,
      onChanged: createMockOnChanged(SUGGESTIONS_DISABLED_BY_USER),
    });

    const authenticationRequiredCheck = createFakePartial<AuthenticationRequiredCheck>({
      get engaged() {
        return authenticationRequiredCheckEngaged;
      },
      details: 'Authentication is required.',
      id: AUTHENTICATION_REQUIRED,
      onChanged: createMockOnChanged(AUTHENTICATION_REQUIRED),
    });

    const stateManager = new DefaultFeatureStateManager(
      suggestionApiErrorCheck,
      authenticationRequiredCheck,
      minInstanceVersionCheck,
      licenseAvailableCheck,
      duoProjectAccessCheck,
      supportedLanguageCheck,
      chatEnabledCheck,
      codeSuggestionEnabledCheck,
      chatLicenseAvailableCheck,
    );
    await stateManager.init(mockSendNotification);

    mockSendNotification.mockReset();
  });

  describe('on init', () => {
    it('should initialize the checks and precompute sorted checks', () => {
      expect(mockDuoProjectAccessCheckInit).toHaveBeenCalled();
      expect(mockSupportedLanguageCheckInit).toHaveBeenCalled();
      // Additional assertions for precomputed sorted checks
      // e.g., checking if the precomputed checks are in the expected priority order
    });
  });

  describe('on check engage', () => {
    it('should update engaged checks set and notify the client', async () => {
      const mockChecksEngagedState = createFakePartial<FeatureState>({
        featureId: CODE_SUGGESTIONS,
        engagedChecks: [
          { checkId: UNSUPPORTED_LANGUAGE, details: 'Language is not supported', engaged: true },
        ],
        allChecks: expect.any(Array),
      });

      checkChangeHandlers.get(UNSUPPORTED_LANGUAGE)?.();

      const allChecks: FeatureState[] = mockSendNotification.mock.calls[0][0];
      const codeSuggestionsChecks = allChecks.find(
        ({ featureId }) => featureId === CODE_SUGGESTIONS,
      );

      expect(codeSuggestionsChecks).toEqual(mockChecksEngagedState);
      expect(mockSendNotification).toHaveBeenCalled();
    });
  });

  describe('on check disengage', () => {
    it('should update engaged checks set and notify the client', () => {
      const mockChecksEngagedState = createFakePartial<FeatureState>({
        featureId: CODE_SUGGESTIONS,
        engagedChecks: [],
        allChecks: expect.any(Array),
      });

      languageCheckEngaged = false;
      checkChangeHandlers.get(UNSUPPORTED_LANGUAGE)?.();

      const allChecks: FeatureState[] = mockSendNotification.mock.calls[0][0];
      const codeSuggestionsChecks = allChecks.find(
        ({ featureId }) => featureId === CODE_SUGGESTIONS,
      );

      expect(codeSuggestionsChecks).toEqual(mockChecksEngagedState);
    });
  });

  describe('checks order', () => {
    beforeEach(() => {
      authenticationRequiredCheckEngaged = true;
      languageCheckEngaged = true;
      duoProjectAccessCheckEngaged = true;
    });

    it('should sort ENGAGED checks in correct order', () => {
      checkChangeHandlers.get(AUTHENTICATION_REQUIRED)?.();
      checkChangeHandlers.get(UNSUPPORTED_LANGUAGE)?.();
      checkChangeHandlers.get(DUO_DISABLED_FOR_PROJECT)?.();

      const allChecks: FeatureState[] = mockSendNotification.mock.calls[2][0];
      const authenticationChecks = allChecks.find(({ featureId }) => featureId === AUTHENTICATION);
      const authChecksOrderedIds = authenticationChecks?.engagedChecks?.map(
        ({ checkId }) => checkId,
      );
      // Check that AUTHENTICATION checks are correctly ordered
      expect(authChecksOrderedIds).toEqual(AUTHENTICATION_CHECK_PRIORITY_ORDERED);

      const codeSuggestionsChecks = allChecks.find(
        ({ featureId }) => featureId === CODE_SUGGESTIONS,
      );
      const codeSuggestionsChecksIds = codeSuggestionsChecks?.engagedChecks?.map(
        ({ checkId }) => checkId,
      );

      // Check that CODE_SUGGESTIONS are correctly ordered
      expect(codeSuggestionsChecksIds).toEqual([
        AUTHENTICATION_REQUIRED,
        DUO_DISABLED_FOR_PROJECT,
        UNSUPPORTED_LANGUAGE,
      ]);

      // Check that CHAT are correctly ordered
      const chatChecks = allChecks.find(({ featureId }) => featureId === CHAT);
      const chatChecksIds = chatChecks?.engagedChecks?.map(({ checkId }) => checkId);
      expect(chatChecksIds).toEqual([AUTHENTICATION_REQUIRED, DUO_DISABLED_FOR_PROJECT]);
    });

    it('should sort ALL checks in correct order', () => {
      checkChangeHandlers.get(DUO_DISABLED_FOR_PROJECT)?.();

      const allChecks: FeatureState[] = mockSendNotification.mock.calls[0][0];
      const authenticationChecks = allChecks.find(({ featureId }) => featureId === AUTHENTICATION);
      const authChecksOrderedIds = authenticationChecks?.allChecks?.map(({ checkId }) => checkId);

      expect(authChecksOrderedIds).toEqual(AUTHENTICATION_CHECK_PRIORITY_ORDERED);

      // Check that CODE_SUGGESTIONS are correctly ordered
      const codeSuggestionsChecks = allChecks.find(
        ({ featureId }) => featureId === CODE_SUGGESTIONS,
      );
      const codeSuggestionsChecksIds = codeSuggestionsChecks?.allChecks?.map(
        ({ checkId }) => checkId,
      );
      // we filter out DISABLED_LANGUAGE because it is the same policy as UNSUPPORTED_LANGUAGE
      expect(codeSuggestionsChecksIds).toEqual(
        CODE_SUGGESTIONS_CHECKS_PRIORITY_ORDERED.filter((check) => check !== DISABLED_LANGUAGE),
      );

      // Check that CHAT are correctly ordered
      const chatChecks = allChecks.find(({ featureId }) => featureId === CHAT);
      const chatChecksIds = chatChecks?.allChecks?.map(({ checkId }) => checkId);
      expect(chatChecksIds).toEqual(CHAT_CHECKS_PRIORITY_ORDERED);
    });
  });
});

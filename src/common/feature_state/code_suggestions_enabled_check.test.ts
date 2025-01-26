import { Disposable } from '@khulnasoft/disposable';
import { DefaultConfigService } from '../config_service';
import { DefaultCodeSuggestionsEnabledCheck } from './code_suggestions_enabled_check';
import { SUGGESTIONS_DISABLED_BY_USER } from './feature_state_management_types';

describe('CodeSuggestionsEnabledTests', () => {
  const disposables: Disposable[] = [];

  const configService = new DefaultConfigService();
  const codeSuggestionsEnabledCheck = new DefaultCodeSuggestionsEnabledCheck(configService);
  const checkEngagedChangeListener = jest.fn();

  beforeEach(() => {
    disposables.push(codeSuggestionsEnabledCheck.onChanged(checkEngagedChangeListener));
  });

  afterEach(() => {
    while (disposables.length > 0) {
      disposables.pop()!.dispose();
    }
  });

  const updateConfig = async (enabled: boolean | undefined) => {
    configService.set('client.codeCompletion.enabled', enabled);

    await new Promise(process.nextTick);
  };

  it('should initialize CodeSuggestionsEnabledCheck correctly', () => {
    expect(codeSuggestionsEnabledCheck.id).toBe(SUGGESTIONS_DISABLED_BY_USER);
    expect(codeSuggestionsEnabledCheck.details).toBe('Code Suggestions manually disabled.');
    expect(codeSuggestionsEnabledCheck.engaged).toBe(false);
  });

  it('should be engaged when code completion is disabled', async () => {
    await updateConfig(false);

    expect(codeSuggestionsEnabledCheck.engaged).toBe(true);
  });

  it('should not be engaged when code completion is enabled', async () => {
    await updateConfig(true);

    expect(codeSuggestionsEnabledCheck.engaged).toBe(false);
  });

  it('should not update engaged when code completion enabled configuration is missing', async () => {
    await updateConfig(false);
    expect(codeSuggestionsEnabledCheck.engaged).toBe(true);

    await updateConfig(undefined);
    expect(codeSuggestionsEnabledCheck.engaged).toBe(true);
  });

  describe('change event', () => {
    it('emits after code suggestions enabled is updated', async () => {
      await updateConfig(undefined);
      jest.mocked(checkEngagedChangeListener).mockClear();

      await updateConfig(true);

      expect(checkEngagedChangeListener).toHaveBeenCalledTimes(1);
    });

    it('does not emit when unrelated config is updated', async () => {
      await updateConfig(undefined);
      jest.mocked(checkEngagedChangeListener).mockClear();

      configService.set('client.telemetry.enabled', false);
      await new Promise(process.nextTick);

      expect(checkEngagedChangeListener).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should have no engaged checks when code suggestions are enabled', async () => {
      const result = await codeSuggestionsEnabledCheck.validate({
        codeCompletion: { enabled: true },
      });

      expect(result).toBeUndefined();
    });

    it('should have an engaged check when code suggestions are disabled', async () => {
      const result = await codeSuggestionsEnabledCheck.validate({
        codeCompletion: { enabled: false },
      });

      expect(result).toEqual({
        checkId: SUGGESTIONS_DISABLED_BY_USER,
        details: 'Code Suggestions manually disabled.',
        engaged: true,
      });
    });

    it('should have no engaged checks when code suggestions configuration is missing', async () => {
      const result = await codeSuggestionsEnabledCheck.validate({});

      expect(result).toBeUndefined();
    });
  });
});

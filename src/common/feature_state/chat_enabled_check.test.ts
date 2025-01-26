import { Disposable } from '@khulnasoft/disposable';
import { DefaultConfigService } from '../config_service';
import { DefaultChatEnabledCheck } from './chat_enabled_check';
import { CHAT_DISABLED_BY_USER } from './feature_state_management_types';

describe('ChatEnabledCheck', () => {
  const disposables: Disposable[] = [];

  const configService = new DefaultConfigService();
  const chatEnabledCheck = new DefaultChatEnabledCheck(configService);
  const checkEngagedChangeListener = jest.fn();

  beforeEach(() => {
    disposables.push(chatEnabledCheck.onChanged(checkEngagedChangeListener));
  });

  afterEach(() => {
    while (disposables.length > 0) {
      disposables.pop()!.dispose();
    }
  });

  const updateConfig = async (enabled: boolean | undefined) => {
    configService.set('client.duoChat.enabled', enabled);

    await new Promise(process.nextTick);
  };

  it('should initialize ChatEnabledCheck correctly', () => {
    expect(chatEnabledCheck.id).toBe(CHAT_DISABLED_BY_USER);
    expect(chatEnabledCheck.details).toBe('Duo Chat manually disabled.');
    expect(chatEnabledCheck.engaged).toBe(false);
  });

  it('should be engaged when chat is disabled', async () => {
    await updateConfig(false);

    expect(chatEnabledCheck.engaged).toBe(true);
  });

  it('should not be engaged when chat is enabled', async () => {
    await updateConfig(true);

    expect(chatEnabledCheck.engaged).toBe(false);
  });

  it('should not update engaged when chat enabled configuration is missing', async () => {
    await updateConfig(false);
    expect(chatEnabledCheck.engaged).toBe(true);

    await updateConfig(undefined);
    expect(chatEnabledCheck.engaged).toBe(true);
  });

  describe('change event', () => {
    it('emits after chat enabled is updated', async () => {
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
    it('should not be valid when the configuration has duo chat disabled', async () => {
      const result = await chatEnabledCheck.validate({ duoChat: { enabled: false } });

      expect(result?.checkId).toBe(CHAT_DISABLED_BY_USER);
      expect(result?.details).toBeDefined();
    });

    it('should be valid when the configuration has duo chat enabled', async () => {
      const result = await chatEnabledCheck.validate({ duoChat: { enabled: true } });

      expect(result).toBeUndefined();
    });
  });
});

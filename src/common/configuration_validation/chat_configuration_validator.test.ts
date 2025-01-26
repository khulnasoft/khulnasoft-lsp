import { DuoChatLicenseCheck } from '../feature_state/duo_chat_license_check';
import { ChatEnabledCheck } from '../feature_state/chat_enabled_check';
import { CHAT, ProjectDuoAccessCheck } from '../feature_state';
import { DefaultChatConfigurationValidator } from './chat_configuration_validator';

describe('ChatConfigurationValidator', () => {
  const config = {};

  let validateProjectDuoAccessMock: jest.Mock;
  let projectDuoAccessCheck: jest.Mocked<ProjectDuoAccessCheck>;

  let validateDuoChatLicenseMock: jest.Mock;
  let duoChatEnabledCheck: jest.Mocked<DuoChatLicenseCheck>;

  let validateChatEnabledMock: jest.Mock;
  let chatEnabledCheck: jest.Mocked<ChatEnabledCheck>;

  let validator: DefaultChatConfigurationValidator;

  beforeEach(() => {
    validateProjectDuoAccessMock = jest.fn();
    projectDuoAccessCheck = {
      validate: validateProjectDuoAccessMock,
    } as unknown as jest.Mocked<ProjectDuoAccessCheck>;

    validateDuoChatLicenseMock = jest.fn();
    duoChatEnabledCheck = {
      validate: validateDuoChatLicenseMock,
    } as unknown as jest.Mocked<DuoChatLicenseCheck>;

    validateChatEnabledMock = jest.fn();
    chatEnabledCheck = {
      validate: validateChatEnabledMock,
    } as unknown as jest.Mocked<ChatEnabledCheck>;

    validator = new DefaultChatConfigurationValidator(
      projectDuoAccessCheck,
      duoChatEnabledCheck,
      chatEnabledCheck,
    );
  });

  it('should include engaged checks in the response', async () => {
    jest.mocked(validateProjectDuoAccessMock).mockResolvedValue(undefined);
    jest.mocked(validateDuoChatLicenseMock).mockResolvedValue({ checkId: 'no-duo-chat-license' });
    jest.mocked(validateChatEnabledMock).mockResolvedValue(undefined);

    const result = await validator.validate(config);

    expect(result?.featureId).toBe(CHAT);
    expect(result?.engagedChecks).toHaveLength(1);
    expect(result?.engagedChecks?.[0].checkId).toBe('no-duo-chat-license');

    expect(validateProjectDuoAccessMock).toHaveBeenCalledWith(config);
    expect(validateDuoChatLicenseMock).toHaveBeenCalledWith(config);
    expect(validateChatEnabledMock).toHaveBeenCalledWith(config);
  });
});

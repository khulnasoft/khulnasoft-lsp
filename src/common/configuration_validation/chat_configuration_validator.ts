import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ClientConfig } from '../config_service';
import { CHAT, FeatureState, ProjectDuoAccessCheck } from '../feature_state';
import { DuoChatLicenseCheck } from '../feature_state/duo_chat_license_check';
import { ChatEnabledCheck } from '../feature_state/chat_enabled_check';
import { StateConfigCheck } from '../feature_state/state_check';
import { ConfigurationValidator } from './configuration_validator';

export type ChatConfigurationValidator = ConfigurationValidator;

export const ChatConfigurationValidator = createInterfaceId<ChatConfigurationValidator>(
  'ChatConfigurationValidator',
);

@Injectable(ChatConfigurationValidator, [
  ProjectDuoAccessCheck,
  DuoChatLicenseCheck,
  ChatEnabledCheck,
])
export class DefaultChatConfigurationValidator implements ChatConfigurationValidator {
  #orderedChecks: StateConfigCheck[] = [];

  constructor(
    projectDuoAccessCheck: ProjectDuoAccessCheck,
    duoChatLicenseCheck: DuoChatLicenseCheck,
    duoChatEnabledCheck: ChatEnabledCheck,
  ) {
    this.#orderedChecks = [projectDuoAccessCheck, duoChatLicenseCheck, duoChatEnabledCheck];
  }

  feature = CHAT;

  async validate(config: ClientConfig): Promise<FeatureState> {
    const results = await Promise.all(this.#orderedChecks.map((check) => check.validate(config)));

    const engagedChecks = results.filter((result) => result !== undefined);

    return { featureId: CHAT, engagedChecks };
  }
}

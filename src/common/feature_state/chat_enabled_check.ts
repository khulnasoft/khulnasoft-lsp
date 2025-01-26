import EventEmitter from 'events';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Disposable } from '@khulnasoft/disposable';
import { ConfigService, ClientConfig } from '../config_service';
import { StateCheck, StateCheckChangedEventData, StateConfigCheck } from './state_check';
import {
  CHAT_DISABLED_BY_USER,
  FeatureStateCheck,
  StateCheckId,
} from './feature_state_management_types';

export type ChatEnabledCheck = StateCheck<typeof CHAT_DISABLED_BY_USER> & StateConfigCheck;

export const ChatEnabledCheck = createInterfaceId<ChatEnabledCheck>('ChatEnabledCheck');

@Injectable(ChatEnabledCheck, [ConfigService])
export class DefaultChatEnabledCheck implements ChatEnabledCheck {
  #subscriptions: Disposable[] = [];

  #stateEmitter = new EventEmitter();

  #isEnabledByUser = true;

  constructor(configService: ConfigService) {
    this.#subscriptions.push(
      configService.onConfigChange((config) => {
        const duoChatEnabled = config.client.duoChat?.enabled;

        if (duoChatEnabled !== undefined) {
          this.#isEnabledByUser = duoChatEnabled;
          this.#stateEmitter.emit('change', this);
        }
      }),
    );
  }

  id = CHAT_DISABLED_BY_USER;

  details = 'Duo Chat manually disabled.';

  get engaged() {
    return !this.#isEnabledByUser;
  }

  onChanged(listener: (data: StateCheckChangedEventData) => void): Disposable {
    this.#stateEmitter.on('change', listener);

    return {
      dispose: () => this.#stateEmitter.removeListener('change', listener),
    };
  }

  dispose() {
    this.#subscriptions.forEach((s) => s.dispose());
  }

  async validate(config: ClientConfig): Promise<FeatureStateCheck<StateCheckId> | undefined> {
    if (config.duoChat?.enabled === false) {
      return {
        checkId: this.id,
        details: this.details,
        engaged: true,
      };
    }

    return undefined;
  }
}

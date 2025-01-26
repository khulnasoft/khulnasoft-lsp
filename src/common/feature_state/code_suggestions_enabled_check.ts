import EventEmitter from 'events';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Disposable } from '@khulnasoft/disposable';
import { ConfigService, ClientConfig } from '../config_service';
import {
  FeatureStateCheck,
  StateCheckId,
  SUGGESTIONS_DISABLED_BY_USER,
} from './feature_state_management_types';
import { StateCheck, StateCheckChangedEventData, StateConfigCheck } from './state_check';

export type CodeSuggestionsEnabledCheck = StateCheck<typeof SUGGESTIONS_DISABLED_BY_USER> &
  StateConfigCheck;

export const CodeSuggestionsEnabledCheck = createInterfaceId<CodeSuggestionsEnabledCheck>(
  'CodeSuggestionsEnabledCheck',
);

@Injectable(CodeSuggestionsEnabledCheck, [ConfigService])
export class DefaultCodeSuggestionsEnabledCheck implements CodeSuggestionsEnabledCheck {
  #subscriptions: Disposable[] = [];

  #stateEmitter = new EventEmitter();

  #isEnabledByUser = true;

  constructor(configService: ConfigService) {
    this.#subscriptions.push(
      configService.onConfigChange((config) => {
        const codeSuggestionsEnabled = config.client.codeCompletion?.enabled;

        if (codeSuggestionsEnabled !== undefined) {
          this.#isEnabledByUser = codeSuggestionsEnabled;
          this.#stateEmitter.emit('change', this);
        }
      }),
    );
  }

  id = SUGGESTIONS_DISABLED_BY_USER;

  details = 'Code Suggestions manually disabled.';

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
    if (config.codeCompletion?.enabled === false) {
      return {
        checkId: this.id,
        details: this.details,
        engaged: true,
      };
    }

    return undefined;
  }
}

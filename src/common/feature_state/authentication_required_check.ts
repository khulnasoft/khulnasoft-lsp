import EventEmitter from 'events';
import { Disposable } from '@khulnasoft/disposable';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { KhulnaSoftApiClient } from '../api';
import { StateCheck, StateCheckChangedEventData } from './state_check';
import { AUTHENTICATION_REQUIRED } from './feature_state_management_types';

export type AuthenticationRequiredCheck = StateCheck<typeof AUTHENTICATION_REQUIRED>;

export const AuthenticationRequiredCheck = createInterfaceId<AuthenticationRequiredCheck>(
  'AuthenticationRequiredCheck',
);

@Injectable(AuthenticationRequiredCheck, [KhulnaSoftApiClient])
export class DefaultAuthenticationRequiredCheck implements AuthenticationRequiredCheck {
  #subscriptions: Disposable[] = [];

  #stateEmitter = new EventEmitter();

  #isApiInValidState = false;

  constructor(api: KhulnaSoftApiClient) {
    this.#subscriptions.push(
      api.onApiReconfigured(async (data) => {
        this.#isApiInValidState = data.isInValidState;
        this.#stateEmitter.emit('change', this);
      }),
    );
  }

  id = AUTHENTICATION_REQUIRED;

  details = 'Authentication required.';

  get engaged() {
    return !this.#isApiInValidState;
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
}

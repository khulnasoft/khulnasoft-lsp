import { EventEmitter } from 'events';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Disposable } from '@khulnasoft/disposable';
import { log } from '../log';
import { FixedTimeCircuitBreaker } from '../circuit_breaker/fixed_time_circuit_breaker';
import { CircuitBreaker } from '../circuit_breaker/circuit_breaker';
import { StateCheck, StateCheckChangedEventData } from './state_check';
import { SUGGESTIONS_API_ERROR } from './feature_state_management_types';

export interface SuggestionApiErrorCheck
  extends StateCheck<typeof SUGGESTIONS_API_ERROR>,
    CircuitBreaker {}

export const SuggestionApiErrorCheck = createInterfaceId<SuggestionApiErrorCheck>(
  'SuggestionCircuitBreakerCheck',
);

@Injectable(SuggestionApiErrorCheck, [])
export class DefaultSuggestionApiErrorCheck implements SuggestionApiErrorCheck {
  #subscriptions: Disposable[] = [];

  #stateEmitter = new EventEmitter();

  #circuitBreaker = new FixedTimeCircuitBreaker();

  constructor() {
    this.#subscriptions.push(
      this.#circuitBreaker.onOpen(this.#fireChange),
      this.#circuitBreaker.onClose(this.#fireChange),
    );
  }

  #fireChange = () => {
    log.debug(`Code Suggestion API error check is  ${this.engaged ? 'engaged' : 'disengaged'}`);
    const data: StateCheckChangedEventData = {
      checkId: this.id,
      details: this.details,
      engaged: this.engaged,
    };
    this.#stateEmitter.emit('change', data);
  };

  onChanged(listener: (data: StateCheckChangedEventData) => void): Disposable {
    this.#stateEmitter.on('change', listener);
    return {
      dispose: () => this.#stateEmitter.removeListener('change', listener),
    };
  }

  get engaged() {
    return this.#circuitBreaker.isOpen();
  }

  id = SUGGESTIONS_API_ERROR;

  details = 'Error requesting suggestions from the API.';

  error = () => this.#circuitBreaker.error();

  success = () => this.#circuitBreaker.success();

  isOpen = () => this.#circuitBreaker.isOpen();

  onOpen = (listener: () => void) => this.#circuitBreaker.onOpen(listener);

  onClose = (listener: () => void) => this.#circuitBreaker.onClose(listener);

  dispose() {
    this.#subscriptions.forEach((s) => s.dispose());
  }
}

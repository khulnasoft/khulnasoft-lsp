import { EventEmitter } from 'events';
import { Disposable } from '@khulnasoft/disposable';
import { ApiRequest } from '../api_types';
import { log } from '../log';
import { KhulnaSoftApiClient } from '../api';
import { InvalidInstanceVersionError } from '../fetch_error';
import { ClientConfig } from '../config_service';
import { StateCheckChangedEventData } from './state_check';
import { StateCheckId } from './feature_state_management_types';

/**
 * ApiStateCheck represents a result of a single API boolean request.
 * Every time we change the API configuration, this check will make a `query`
 * to the API and then uses the `checkSuccessful` callback to verify whether the
 * response is successful or not.
 */
export class ApiStateCheck<T> implements Disposable {
  #subscriptions: Disposable[] = [];

  #stateEmitter = new EventEmitter();

  #api: KhulnaSoftApiClient;

  #isSuccessful = false;

  #query: ApiRequest<T>;

  #checkSuccessful: (x: T) => boolean;

  id: StateCheckId;

  details: string;

  constructor(
    api: KhulnaSoftApiClient,
    id: StateCheckId,
    details: string,
    query: ApiRequest<T>,
    checkSuccessful: (x: T) => boolean,
  ) {
    this.#api = api;
    this.#checkSuccessful = checkSuccessful;
    this.#query = query;
    this.id = id;
    this.details = details;

    this.#subscriptions.push(
      this.#api.onApiReconfigured(async (data) => {
        if (!data.isInValidState) return;
        await this.#checkIfLicenseAvailable();
      }),
    );
  }

  async #checkIfLicenseAvailable(): Promise<void> {
    try {
      const response = await this.#api.fetchFromApi(this.#query);

      this.#isSuccessful = this.#checkSuccessful(response);
    } catch (error) {
      log.error(`Failed to request api status information.`, error);

      if (error instanceof InvalidInstanceVersionError) {
        return;
      }

      this.#isSuccessful = false;
    }

    this.#stateEmitter.emit('change', this);
  }

  onChanged(listener: (data: StateCheckChangedEventData) => void): Disposable {
    this.#stateEmitter.on('change', listener);

    return {
      dispose: () => this.#stateEmitter.removeListener('change', listener),
    };
  }

  get engaged() {
    return !this.#isSuccessful;
  }

  dispose() {
    this.#subscriptions.forEach((s) => s.dispose());
  }

  async validate(config: ClientConfig): Promise<boolean> {
    const baseUrl = config.baseUrl ?? '';
    const token = config.token ?? '';

    const queryForConfig = {
      ...this.#query,
      baseUrl,
      token,
    };

    try {
      const response = await this.#api.fetchFromApi<T>(queryForConfig);

      return this.#checkSuccessful(response);
    } catch (error) {
      log.error(`Failed to validate api status for configuration.`, error);
      return false;
    }
  }
}

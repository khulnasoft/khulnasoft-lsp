import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Disposable } from '@khulnasoft/disposable';
import { NotifyFn } from '../notifier';
import { log } from '../log';
import { SuggestionApiErrorCheck } from './suggestion_api_error_check';

export interface SuggestionApiErrorNotifier {
  setErrorNotifyFn(errorNotifyFn: NotifyFn<void>): void;
  setRecoveryNotifyFn(recoveryNotifyFn: NotifyFn<void>): void;
}

export const SuggestionApiErrorNotifier = createInterfaceId<SuggestionApiErrorNotifier>(
  'SuggestionApiErrorNotifier',
);

@Injectable(SuggestionApiErrorNotifier, [SuggestionApiErrorCheck])
export class DefaultSuggestionApiErrorNotifier implements SuggestionApiErrorNotifier, Disposable {
  #errorNotifyFn?: NotifyFn<void>;

  #recoveryNotifyFn?: NotifyFn<void>;

  #subscriptions: Disposable[] = [];

  constructor(apiErrorCheck: SuggestionApiErrorCheck) {
    this.#subscriptions.push(apiErrorCheck.onOpen(this.#sendErrorNotification));
    this.#subscriptions.push(apiErrorCheck.onClose(this.#sendRecoveryNotification));
  }

  #sendErrorNotification = () => {
    if (!this.#errorNotifyFn) {
      // Only logging an error because this misconfiguration issue won't show instantly on startup.
      // If we forget to add the notify functions, these listeners would start failing only if there are 4 consecutive
      // api errors.
      log.error(
        'errorNotifyFn is missing in the ApiErrorNotifier. It has not been initialized during application startup. This is a bug that user cannot fix.',
      );
      return;
    }
    this.#errorNotifyFn().catch((e) => log.error('Error when sending API error notification:', e));
  };

  #sendRecoveryNotification = () => {
    if (!this.#recoveryNotifyFn) {
      log.error(
        'recoveryNotifyFn is missing in the ApiErrorNotifier. It has not been initialized during application startup. This is a bug that user cannot fix.',
      );
      throw new Error('test');
    }
    this.#recoveryNotifyFn().catch((e) =>
      log.error('Error when sending API recovery notification:', e),
    );
  };

  setErrorNotifyFn(errorNotifyFn: NotifyFn<void>): void {
    this.#errorNotifyFn = errorNotifyFn;
  }

  setRecoveryNotifyFn(recoveryNotifyFn: NotifyFn<void>): void {
    this.#recoveryNotifyFn = recoveryNotifyFn;
  }

  dispose(): void {
    this.#subscriptions.forEach((s) => s.dispose());
  }
}

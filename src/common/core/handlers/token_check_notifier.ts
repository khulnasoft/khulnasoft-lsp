import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { KhulnaSoftApiClient } from '../../api';
import { Notifier, NotifyFn } from '../../notifier';
import { TokenCheckNotificationParams } from '../../notifications';

export interface TokenCheckNotifier extends Notifier<TokenCheckNotificationParams> {}

export const TokenCheckNotifier = createInterfaceId<TokenCheckNotifier>('TokenCheckNotifier');

@Injectable(TokenCheckNotifier, [KhulnaSoftApiClient])
export class DefaultTokenCheckNotifier implements TokenCheckNotifier {
  #notify: NotifyFn<TokenCheckNotificationParams> | undefined;

  constructor(api: KhulnaSoftApiClient) {
    api.onApiReconfigured(async (event) => {
      if (!event.isInValidState) {
        if (!this.#notify) {
          throw new Error(
            'The DefaultTokenCheckNotifier has not been initialized. Call init first.',
          );
        }
        await this.#notify({
          message: event.validationMessage,
        });
      }
    });
  }

  init(callback: NotifyFn<TokenCheckNotificationParams>) {
    this.#notify = callback;
  }
}

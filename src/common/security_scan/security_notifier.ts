import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Notifier, NotifyFn } from '../notifier';
import { SecurityScanClientResponse } from './types';

export interface SecurityScanNotifier extends Notifier<SecurityScanClientResponse> {
  sendScanResponse: (response: SecurityScanClientResponse) => Promise<void>;
}
export const SecurityScanNotifier = createInterfaceId<SecurityScanNotifier>('SecurityScanNotifier');

@Injectable(SecurityScanNotifier, [])
export class DefaultSecurityScanNotifier implements SecurityScanNotifier {
  #notify?: NotifyFn<SecurityScanClientResponse>;

  async init(notify: NotifyFn<SecurityScanClientResponse>): Promise<void> {
    this.#notify = notify;
  }

  sendScanResponse(response: SecurityScanClientResponse) {
    if (!this.#notify) {
      throw new Error('The security scan notifier has not been initialized. Call init first.');
    }
    return this.#notify(response);
  }
}

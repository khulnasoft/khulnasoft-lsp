import { createInterfaceId } from '@khulnasoft/di';
import { SanitizedError } from '../errors/sanitized_error';

export interface ErrorTracker {
  trackError(e: SanitizedError): void;
}
export const ErrorTracker = createInterfaceId<ErrorTracker>('ErrorTracker');

export class NoopSentryTracker implements ErrorTracker {
  trackError() {}
}

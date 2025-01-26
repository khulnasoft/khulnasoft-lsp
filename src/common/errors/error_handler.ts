import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { logCtxParent } from '@khulnasoft/logging';
import { log } from '../log';
import { ErrorTracker } from '../tracking/error_tracker';
import { SystemContext } from '../request_context/system_context';
import { AuthContext } from '../request_context/auth_context';
import { SanitizedError } from './sanitized_error';

export interface ErrorHandler {
  handleError(message: string, error: unknown): void;
}

export const ErrorHandler = createInterfaceId<ErrorHandler>('ErrorHandler');

@Injectable(ErrorHandler, [ErrorTracker, SystemContext, AuthContext])
export class DefaultErrorHandler implements ErrorHandler {
  #errorTracker: ErrorTracker;

  #systemContext: SystemContext;

  #authContext: AuthContext;

  constructor(errorTracker: ErrorTracker, systemContext: SystemContext, authContext: AuthContext) {
    this.#errorTracker = errorTracker;
    this.#systemContext = systemContext;
    this.#authContext = authContext;
  }

  handleError(message: string, e?: unknown): void {
    const error = e instanceof SanitizedError ? e.originalError : e;
    const ctx = logCtxParent('Context', this.#systemContext, this.#authContext);
    log.withContext(ctx).error(message, error);
    if (this.#isTrackableError(e)) {
      this.#errorTracker.trackError(e);
    }
  }

  #isTrackableError(error: unknown): error is SanitizedError {
    return error instanceof SanitizedError;
  }
}

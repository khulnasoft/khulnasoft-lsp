import { logCtxItem, logCtxParent, Logger } from '@khulnasoft/logging';
import { AuthContext } from '../request_context/auth_context';
import { SystemContext } from '../request_context/system_context';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { ErrorTracker } from '../tracking/error_tracker';
import { log } from '../log';
import { DefaultErrorHandler, ErrorHandler } from './error_handler';
import { SanitizedError } from './sanitized_error';

jest.mock('../log');

describe('Error Handler', () => {
  const systemContextItem = logCtxItem('system', 'system-test');
  const authContextItem = logCtxItem('auth', 'auth-test');
  let errorHandler: ErrorHandler;
  const sentryTracker = createFakePartial<ErrorTracker>({
    trackError: jest.fn(),
  });

  let contextLogger: Logger;

  beforeEach(() => {
    errorHandler = new DefaultErrorHandler(
      sentryTracker,
      createFakePartial<SystemContext>(systemContextItem),
      createFakePartial<AuthContext>(authContextItem),
    );

    contextLogger = createFakePartial<Logger>({
      error: jest.fn(),
    });
    jest.mocked(log.withContext).mockReturnValue(contextLogger);
  });

  it('handle trackable error', () => {
    const error = new SanitizedError('test error', new Error());
    errorHandler.handleError('test error', error);
    expect(sentryTracker.trackError).toHaveBeenCalledWith(error);
  });

  it('handle non trackable error', () => {
    const error = new Error();
    errorHandler.handleError('test error', error);
    expect(sentryTracker.trackError).not.toHaveBeenCalled();
  });

  it('logs context', () => {
    const error = new Error();
    errorHandler.handleError('test error', error);

    expect(log.withContext).toHaveBeenCalledWith(
      logCtxParent('Context', systemContextItem, authContextItem),
    );

    expect(contextLogger.error).toHaveBeenCalledWith('test error', error);
  });

  it('unwraps sanitized error for local logs', () => {
    const innerError = new Error('test error');
    const error = new SanitizedError('sanitized message', innerError);

    errorHandler.handleError('problem', error);

    expect(contextLogger.error).toHaveBeenCalledWith(expect.any(String), innerError);
  });
});

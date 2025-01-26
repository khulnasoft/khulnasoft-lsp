import { LogMethod, logCtxItem, logCtxParent } from '@khulnasoft/logging';
import { ConfigService } from './config_service';
import { log } from './log';
import { createFakePartial } from './test_utils/create_fake_partial';
import { LOG_LEVEL, LogLevel } from './log_types';

const logFunction: jest.SpyInstance = jest.spyOn(console, 'log');

describe('logging', () => {
  const setupLogger = (logLevel: LogLevel = LOG_LEVEL.INFO) => {
    const configService = createFakePartial<ConfigService>({
      get: jest.fn().mockReturnValue(logLevel),
    });

    log.setup(configService);
  };

  afterEach(() => {
    expect.hasAssertions();
  });

  const getLoggedMessage = () => logFunction.mock.calls[0][0];

  describe('log', () => {
    describe('setup', () => {
      it('shows only info logs by default', () => {
        log.debug('message');
        expect(logFunction).not.toHaveBeenCalled();

        log.info('message 2');
        expect(getLoggedMessage()).toContain(`[info]: message 2`);
      });

      it('blocks logs when more constrained level is set', () => {
        setupLogger(LOG_LEVEL.ERROR);

        log.warn('message');
        expect(logFunction).not.toHaveBeenCalled();

        log.error('message 2');
        expect(getLoggedMessage()).toContain(`[error]: message 2`);
      });

      it('allows logs when more relaxed level is set', () => {
        setupLogger(LOG_LEVEL.DEBUG);

        log.debug('message');
        expect(getLoggedMessage()).toContain(`[debug]: message`);
      });

      it('defaults to "info" when invalid level is supplied by client', () => {
        setupLogger('other' as LogLevel);

        log.debug('message');
        expect(logFunction).not.toHaveBeenCalled();

        log.info('message 2');
        expect(getLoggedMessage()).toContain(`[info]: message 2`);
      });
    });

    describe('logging', () => {
      beforeEach(() => {
        setupLogger();
      });

      it('passes the argument to the handler', () => {
        const message = 'A very bad error occurred';
        log.info(message);
        expect(logFunction).toBeCalledTimes(1);
        expect(getLoggedMessage()).toContain(`[info]: ${message}`);
      });

      type TestTuple = [LogMethod, LogLevel];

      it('does not log debug logs by default', () => {
        log.debug('message');
        expect(logFunction).not.toBeCalled();
      });

      it.each<TestTuple>([
        ['info', LOG_LEVEL.INFO],
        ['warn', LOG_LEVEL.WARNING],
        ['error', LOG_LEVEL.ERROR],
      ])('it handles log level "%s"', (methodName, logLevel) => {
        log[methodName]('message');
        expect(getLoggedMessage()).toContain(`[${logLevel}]: message`);
        expect(getLoggedMessage()).not.toMatch(/\s+Error\s+at.*log\.[jt]s/m);
      });

      it('indents multiline messages', () => {
        log.error('error happened\nand the next line\nexplains why');
        expect(getLoggedMessage()).toContain(
          `[error]: error happened\n    and the next line\n    explains why`,
        );
      });

      describe.each`
        exception             | error                 | expectation
        ${new Error('wrong')} | ${new Error('wrong')} | ${'returns the error object '}
        ${'error'}            | ${new Error('error')} | ${'transforms string into Error'}
        ${0}                  | ${'0'}                | ${'returns JSON.stringify of the exception otherwise'}
      `('get Error from unknown exception', ({ exception, error, expectation }) => {
        it(`${expectation}`, () => {
          log.error('test message', exception);
          expect(getLoggedMessage()).toContain(error.message || error);
        });
      });
    });

    describe('log Error', () => {
      it('passes the argument to the handler', () => {
        const err = new Error('A very bad error occurred');
        err.stack = 'stack';
        log.error(err);
        expect(getLoggedMessage()).toMatch(/\[error\]: stack/m);
      });
    });
  });

  it('logs error with context', () => {
    const message = 'test message';
    const ctx = logCtxParent('System', logCtxItem('IDE', 'JetBrains IDEA (1.0.0)'));
    const error = new Error('test error');

    log.withContext(ctx).error(message, error);

    expect(getLoggedMessage()).toMatch(/\[error\]: test message/);
    expect(getLoggedMessage()).toMatch(/- System:\n\s+- IDE: JetBrains IDEA \(1\.0\.0\)/gm);
    expect(getLoggedMessage()).toMatch(/test error/);
  });
});

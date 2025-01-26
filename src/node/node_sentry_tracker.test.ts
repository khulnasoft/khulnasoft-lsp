import * as Sentry from '@sentry/node';
import { DefaultConfigService } from '../common';
import { SanitizedError } from '../common/errors/sanitized_error';
import { SystemContext } from '../common/request_context/system_context';
import { createFakePartial } from '../common/test_utils/create_fake_partial';
import { NodeSentryTracker } from './node_sentry_tracker';

jest.mock('@sentry/node');

describe('Sentry Tracker', () => {
  let sentryTracker: NodeSentryTracker;
  const configService = new DefaultConfigService();

  beforeEach(() => {
    sentryTracker = new NodeSentryTracker(configService, createFakePartial<SystemContext>({}));
  });

  describe('isEnabled', () => {
    it('should be enabled by default', () => {
      expect(sentryTracker.isEnabled()).toBe(true);
      const error = new SanitizedError('test error', new Error());
      sentryTracker.trackError(error);
      expect(Sentry.captureException).toHaveBeenCalledWith({ message: 'test error' });
    });

    it('should be toggled by telemetry config', () => {
      configService.set('client.telemetry.enabled', false);
      expect(sentryTracker.isEnabled()).toBe(false);
      const error = new SanitizedError('test error', new Error());
      sentryTracker.trackError(error);
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});

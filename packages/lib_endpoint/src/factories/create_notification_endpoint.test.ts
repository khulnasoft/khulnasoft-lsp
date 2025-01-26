import { z } from 'zod';
import { NO_PARAMS } from '../constants';
import { createNotificationEndpoint } from './create_notification_endpoint';

describe('createNotificationEndpoint', () => {
  it('should return a valid notification definition', () => {
    const schema = z.object({ name: z.string() });
    const handle = jest.fn();

    const notification = createNotificationEndpoint({
      methodName: 'test-notification',
      paramsSchema: schema,
      handle,
    });

    expect(notification.type).toBe('notification');
    expect(notification.methodName).toBe('test-notification');
    expect(notification.paramsSchema).toBe(schema);
    expect(notification.handle).toBe(handle);
  });

  it('should handle notifications with no parameters', () => {
    const handle = jest.fn();

    const notification = createNotificationEndpoint({
      methodName: 'no-params-notification',
      paramsSchema: NO_PARAMS,
      handle,
    });

    expect(notification.paramsSchema.safeParse(undefined).success).toBe(true);
    expect(notification.handle).toBe(handle);
  });
});

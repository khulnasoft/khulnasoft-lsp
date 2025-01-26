import { NotificationEndpoint } from '../types';

/**
 * Creates a notification endpoint configuration.
 *
 * @example
 * ```typescript
 * const notifyUser = createNotificationEndpoint({
 *   methodName: 'notifyUser',
 *   params: z.object({
 *     userId: z.string(),
 *     message: z.string()
 *   }),
 *   handle: async (params) => {
 *     await sendNotification(params.userId, params.message);
 *   }
 * });
 * ```
 */
export function createNotificationEndpoint<TParams>(
  params: Omit<NotificationEndpoint<TParams>, 'type'>,
): NotificationEndpoint<TParams> {
  return {
    type: 'notification',
    ...params,
  };
}

import { MessageBus } from '@khulnasoft/message-bus';
import { ControllerResponseEnum, ControllerData } from './types';
import { NO_REPLY } from './constants';

/** Each registered function follows a pattern of reacting
 * to a notification with the mapped function and then
 * responding to the client with a different notification for the result. */
export const registerControllers = (
  messageBus: MessageBus,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: Array<(...args: any[]) => ControllerResponseEnum>,
): void => {
  callbacks.forEach((fn) => {
    messageBus.onNotification(fn.name, async (...args) => {
      try {
        const queue: ControllerData = await fn(...args);
        if (queue === NO_REPLY) return;

        // Normalize 1 or many responses into an array of responses
        [queue].flat().forEach(async (response) => {
          const res = await Promise.resolve(response);
          if (res === NO_REPLY) return;

          [res].flat().forEach(({ eventName, data }) => {
            messageBus.sendNotification(eventName, data);
          });
        });
      } catch (e) {
        const error = e as Error;

        messageBus.sendNotification(
          'workflowError',
          error.message || 'An unexpected error occured while processing your request.',
        );
      }
    });
  });
};

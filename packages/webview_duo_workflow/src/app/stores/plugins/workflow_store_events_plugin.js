import { setResponseListener } from '../../../common/bridge';
/**
 * Method that attaches the listeners to each store. This is to bind
 * all stores to the a communication layer that receives notifications
 * and execute defined actions. This method will be called only once when the
 * store is being created.
 *
 * @param context Pinia context.
 * @returns  void
 */
export function setWorkflowStoreEvents(context) {
  // The `if` here helps TS with type inference
  if (context.options?.events) {
    Object.entries(context.options.events).forEach(([event, action]) => {
      setResponseListener(event, context.store[action]);
    });
  }
}

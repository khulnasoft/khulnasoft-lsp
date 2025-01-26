import type { RpcNotificationDefinition, RpcRequestDefinition } from '@khulnasoft/rpc-message';

/**
 * Handler for processing messages.
 *
 * The `handle` method is used to process the parameters and optionally return a response.
 *
 * @template TParams - The type of parameters accepted by the handler.
 * @template TResponse - The type of response returned by the handler.
 */
export type EndpointHandler<TParams = unknown, TResponse = void> = {
  /**
   * Processes the message's parameters and returns a response.
   *
   * If `TParams` is `never`, the `handle` method does not require parameters.
   */
  handle: TParams extends never | undefined | unknown
    ? (params?: unknown) => TResponse | Promise<TResponse> // No params needed
    : (params: TParams) => TResponse | Promise<TResponse>; // Params required
};

/**
 * Configuration for an inbound notification endpoint.
 *
 * An endpoint defines the behavior for handling incoming notification messages.
 *
 * @template TParams - The type of parameters accepted by this endpoint.
 */
export interface NotificationEndpoint<TParams = unknown>
  extends RpcNotificationDefinition<TParams>,
    EndpointHandler<TParams> {}

/**
 * Configuration for an inbound request-response endpoint.
 *
 * An endpoint defines the behavior for handling incoming request-response messages.
 *
 * @template TParams - The type of parameters accepted by this endpoint.
 * @template TResponse - The type of response returned by this endpoint.
 */
export interface RequestEndpoint<TParams = unknown, TResponse = void>
  extends RpcRequestDefinition<TParams, TResponse>,
    EndpointHandler<TParams, TResponse> {}

/**
 * Union type representing any type of endpoint.
 *
 * An endpoint can either be a notification endpoint or a request endpoint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Endpoint = NotificationEndpoint<any> | RequestEndpoint<any, any>;

/**
 * Checks if the given endpoint is a `NotificationEndpoint`.
 *
 * @param {Endpoint} endpoint - The endpoint to check.
 * @returns {boolean} - `true` if the endpoint is a `NotificationEndpoint`, otherwise `false`.
 */
export function isNotificationEndpoint(endpoint: Endpoint): endpoint is NotificationEndpoint {
  return endpoint.type === 'notification';
}

/**
 * Checks if the given endpoint is a `RequestEndpoint`.
 *
 * @param {Endpoint} endpoint - The endpoint to check.
 * @returns {boolean} - `true` if the endpoint is a `RequestEndpoint`, otherwise `false`.
 */
export function isRequestEndpoint(endpoint: Endpoint): endpoint is RequestEndpoint {
  return endpoint.type === 'request';
}

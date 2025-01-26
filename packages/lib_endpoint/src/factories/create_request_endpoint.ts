import { RequestEndpoint } from '../types';

/**
 * Creates a request-response endpoint configuration.
 *
 * @example
 * ```typescript
 * const getUserData = createRequestEndpoint({
 *   methodName: 'getUserData',
 *   params: z.object({
 *     userId: z.string()
 *   }),
 *   response: z.object({
 *     id: z.string(),
 *     name: z.string(),
 *     email: z.string()
 *   }),
 *   handle: async (params) => {
 *     return await userService.getData(params.userId);
 *   }
 * });
 * ```
 */
export function createRequestEndpoint<TParams, TResponse>(
  params: Omit<RequestEndpoint<TParams, TResponse>, 'type'>,
): RequestEndpoint<TParams, TResponse> {
  return {
    type: 'request',
    ...params,
  };
}

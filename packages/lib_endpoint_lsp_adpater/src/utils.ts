import { Endpoint } from '@khulnasoft/endpoint';
import { Middleware, MiddlewareContext } from './types';

export function applyMiddleware(
  handler: (params: unknown) => Promise<unknown>,
  middlewares: Middleware[],
  context: MiddlewareContext,
): (params: unknown) => Promise<unknown> {
  return (params) =>
    middlewares.reduceRight(
      (next, middleware) => (p) => middleware.handle(p, next, context),
      handler,
    )(params);
}

export function createMiddlewareContext(endpointDefinition: Endpoint): MiddlewareContext {
  return { endpoint: endpointDefinition };
}

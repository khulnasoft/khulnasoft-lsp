import { RpcMessageDefinition } from '@khulnasoft/rpc-message';

export type MiddlewareContext = {
  endpoint: RpcMessageDefinition;
};
export type NextMiddleware<TResponse> = () => Promise<TResponse>;

export interface Middleware {
  handle(
    params: unknown,
    next: (params: unknown) => Promise<unknown>,
    context: MiddlewareContext,
  ): Promise<unknown>;
}

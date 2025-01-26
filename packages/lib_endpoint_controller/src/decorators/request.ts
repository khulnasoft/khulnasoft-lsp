import { z } from 'zod';
import { NO_PARAMS, NO_RESPONSE } from '@khulnasoft/endpoint';
import { setEndpointMetadata } from '../metadata';

type HandlerResult<T> = T | Promise<T>;

type RequestHandleMethod<TParamSchema extends z.ZodType, TResponseSchema extends z.ZodType> = {
  (param: z.infer<TParamSchema>): HandlerResult<z.infer<TResponseSchema>>;
};

export function request<
  TParams extends z.ZodType = typeof NO_PARAMS,
  TResponse extends z.ZodType = typeof NO_RESPONSE,
>(
  methodName: string,
  options?: {
    paramsSchema?: TParams;
    responseSchema?: TResponse;
  },
) {
  return <M extends RequestHandleMethod<TParams, TResponse>>(target: M) => {
    setEndpointMetadata(target, {
      type: 'request',
      methodName,
      paramsSchema: options?.paramsSchema ?? NO_PARAMS,
      responseSchema: options?.responseSchema ?? NO_RESPONSE,
    });

    return target;
  };
}

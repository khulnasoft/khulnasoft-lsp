import { z } from 'zod';
import { NO_PARAMS } from '@khulnasoft/endpoint';
import { setEndpointMetadata } from '../metadata';

type NotificationHandlerMethod<TParamSchema extends z.ZodType> = (
  param: z.infer<TParamSchema>,
) => void | Promise<void>;

export function notification<TParams extends z.ZodType = typeof NO_PARAMS>(
  methodName: string,
  options?: {
    paramsSchema?: TParams;
  },
) {
  return <M extends NotificationHandlerMethod<TParams>>(target: M) => {
    setEndpointMetadata(target, {
      type: 'notification',
      methodName,
      paramsSchema: options?.paramsSchema ?? NO_PARAMS,
    });

    return target;
  };
}

import { Endpoint, EndpointProvider } from '@khulnasoft/endpoint';
import { getControllerEndpointMetadata } from './utils';
import { Constructor } from './types';

export abstract class Controller implements EndpointProvider {
  getEndpoints(): Endpoint[] {
    const constructor = this.constructor as Constructor<this>;
    const endpointMetadata = getControllerEndpointMetadata(constructor);

    return endpointMetadata.map((metadata) => {
      const method = this[metadata.classMethodName as keyof this];

      if (typeof method !== 'function') {
        throw new Error(
          `Handler "${metadata.classMethodName}" is not a function in ${constructor.name}`,
        );
      }

      // Type guard to ensure method is callable
      const handle = method.bind(this) as (...args: unknown[]) => Promise<unknown> | unknown;

      return {
        ...metadata,
        handle,
      } as Endpoint;
    });
  }
}

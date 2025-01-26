import { withNamespace, Message } from '@khulnasoft/rpc-message';
import { getControllerMetadata, getEndpointMetadata } from '../metadata';
import { Constructor } from '../types';

type ControllerEndpointMetadata = Message & {
  classMethodName: string;
};

export function getControllerEndpointMetadata<T extends Constructor>(
  target: T,
): ControllerEndpointMetadata[] {
  const endpoints: ControllerEndpointMetadata[] = [];
  const controllerMetadata = getControllerMetadata(target);

  let proto = target.prototype;
  while (proto && proto !== Object.prototype) {
    const props = Object.getOwnPropertyNames(proto);

    for (const prop of props) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
      if (descriptor && typeof descriptor.value === 'function') {
        const metadata = getEndpointMetadata(descriptor.value);
        if (metadata) {
          endpoints.push({
            ...metadata,
            classMethodName: prop,
          });
        }
      }
    }

    proto = Object.getPrototypeOf(proto);
  }

  return controllerMetadata?.route ? withNamespace(controllerMetadata.route, endpoints) : endpoints;
}

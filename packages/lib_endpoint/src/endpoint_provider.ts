import { createInterfaceId } from '@khulnasoft/di';
import { Endpoint } from './types';

/**
 * Interface for providing endpoint definitions for the system.
 *
 * The `EndpointDefinitionProvider` is designed to act as a contract for components or modules
 * that supply endpoint definitions. These endpoint definitions represent the available
 * notification and request handlers within a specific feature, module, or system.
 *
 * @interface EndpointDefinitionProvider
 * @method getEndpoints - Returns an array of `EndpointDefinition` objects.
 */
export interface EndpointProvider {
  getEndpoints(): Endpoint[];
}

export const EndpointProvider = createInterfaceId<EndpointProvider>('EndpointProvider');

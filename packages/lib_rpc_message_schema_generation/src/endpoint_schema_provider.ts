import { z } from 'zod';
import {
  RpcMessageDefinition,
  RpcNotificationDefinition,
  RpcRequestDefinition,
} from '@khulnasoft/rpc-message';
import { SchemaProvider } from './schema_provider';

export const ENDPOINT_SCHEMA_TITLE = 'API Endpoints';

export class EndpointSchemaProvider implements SchemaProvider {
  readonly #endpoints: RpcMessageDefinition[];

  constructor(endpoints: RpcMessageDefinition[]) {
    this.#endpoints = endpoints;
  }

  getSchema(): z.ZodType {
    const endpointSchemas = this.#endpoints.reduce<Record<string, z.ZodType>>((acc, endpoint) => {
      acc[endpoint.methodName] = this.#createEndpointSchema(endpoint);
      return acc;
    }, {});

    return z.object(endpointSchemas).describe(ENDPOINT_SCHEMA_TITLE);
  }

  #createEndpointSchema(endpoint: RpcMessageDefinition): z.ZodType {
    switch (endpoint.type) {
      case 'notification':
        return this.#createNotificationSchema(endpoint as RpcNotificationDefinition);
      case 'request':
        return this.#createRequestSchema(endpoint as RpcRequestDefinition);
      default:
        throw new Error(`Endpoint type not supported`);
    }
  }

  #createRequestSchema(endpoint: RpcRequestDefinition): z.ZodType {
    return z
      .object({
        type: z.literal('request'),
        methodName: z.literal(endpoint.methodName),
        params: endpoint.paramsSchema,
        response: endpoint.responseSchema,
      })
      .describe(`Request endpoint: ${endpoint.methodName}`);
  }

  #createNotificationSchema(endpoint: RpcNotificationDefinition): z.ZodType {
    return z
      .object({
        type: z.literal('notification'),
        methodName: z.literal(endpoint.methodName),
        params: endpoint.paramsSchema,
      })
      .describe(`Notification endpoint: ${endpoint.methodName}`);
  }
}

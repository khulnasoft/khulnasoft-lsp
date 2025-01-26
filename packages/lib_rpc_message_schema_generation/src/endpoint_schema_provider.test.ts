import { z } from 'zod';
import {
  createRpcNotificationDefinition,
  createRpcRequestDefinition,
  NO_PARAMS,
} from '@khulnasoft/rpc-message';
import { EndpointSchemaProvider, ENDPOINT_SCHEMA_TITLE } from './endpoint_schema_provider';

describe('EndpointSchemaProvider', () => {
  describe('schema generation', () => {
    it('generates empty schema for no endpoints', () => {
      const provider = new EndpointSchemaProvider([]);
      const schema = provider.getSchema();

      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('includes schema description', () => {
      const provider = new EndpointSchemaProvider([]);
      const schema = provider.getSchema();

      expect(schema.description).toBe(ENDPOINT_SCHEMA_TITLE);
    });
  });

  describe('notification endpoints', () => {
    it('handles NO_PARAMS', () => {
      const endpoint = createRpcNotificationDefinition({
        methodName: 'test.notification',
        paramsSchema: NO_PARAMS,
      });

      const provider = new EndpointSchemaProvider([endpoint]);
      const schema = provider.getSchema();

      const result = schema.safeParse({
        'test.notification': {
          type: 'notification',
          methodName: 'test.notification',
          params: undefined,
        },
      });

      expect(result.success).toBe(true);
    });

    it('handles params schema', () => {
      const endpoint = createRpcNotificationDefinition({
        methodName: 'test.notification',
        paramsSchema: z.object({
          message: z.string(),
          priority: z.number(),
        }),
      });

      const provider = new EndpointSchemaProvider([endpoint]);
      const schema = provider.getSchema();

      const result = schema.safeParse({
        'test.notification': {
          type: 'notification',
          methodName: 'test.notification',
          params: {
            message: 'test message',
            priority: 1,
          },
        },
      });

      expect(result.success).toBe(true);
    });

    it('fails on invalid params', () => {
      const endpoint = createRpcNotificationDefinition({
        methodName: 'test.notification',
        paramsSchema: z.object({
          message: z.string(),
        }),
      });

      const provider = new EndpointSchemaProvider([endpoint]);
      const schema = provider.getSchema();

      const result = schema.safeParse({
        'test.notification': {
          type: 'notification',
          methodName: 'test.notification',
          params: {
            message: 123, // should be string
          },
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('request endpoints', () => {
    it('handles basic request/response schema', () => {
      const endpoint = createRpcRequestDefinition({
        methodName: 'test.request',
        paramsSchema: z.object({ id: z.number() }),
        responseSchema: z.object({ data: z.string() }),
      });

      const provider = new EndpointSchemaProvider([endpoint]);
      const schema = provider.getSchema();

      const result = schema.safeParse({
        'test.request': {
          type: 'request',
          methodName: 'test.request',
          params: { id: 123 },
          response: { data: 'test' },
        },
      });

      expect(result.success).toBe(true);
    });

    it('handles complex schema types', () => {
      const endpoint = createRpcRequestDefinition({
        methodName: 'test.complex',
        paramsSchema: z.object({
          id: z.number(),
          tags: z.array(z.string()),
          config: z.object({
            enabled: z.boolean(),
            options: z.record(z.string()),
          }),
          status: z.enum(['active', 'inactive']),
        }),
        responseSchema: z.object({
          success: z.boolean(),
          data: z.nullable(z.string()),
        }),
      });

      const provider = new EndpointSchemaProvider([endpoint]);
      const schema = provider.getSchema();

      const result = schema.safeParse({
        'test.complex': {
          type: 'request',
          methodName: 'test.complex',
          params: {
            id: 123,
            tags: ['tag1', 'tag2'],
            config: {
              enabled: true,
              options: { key: 'value' },
            },
            status: 'active',
          },
          response: {
            success: true,
            data: null,
          },
        },
      });

      expect(result.success).toBe(true);
    });

    it('fails on invalid response', () => {
      const endpoint = createRpcRequestDefinition({
        methodName: 'test.request',
        paramsSchema: z.object({ id: z.number() }),
        responseSchema: z.object({ data: z.string() }),
      });

      const provider = new EndpointSchemaProvider([endpoint]);
      const schema = provider.getSchema();

      const result = schema.safeParse({
        'test.request': {
          type: 'request',
          methodName: 'test.request',
          params: { id: 123 },
          response: { data: 123 }, // should be string
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('multiple endpoints', () => {
    it('handles mixed endpoint types', () => {
      const notification = createRpcNotificationDefinition({
        methodName: 'test.notification',
        paramsSchema: z.object({ message: z.string() }),
      });

      const request = createRpcRequestDefinition({
        methodName: 'test.request',
        paramsSchema: z.object({ id: z.number() }),
        responseSchema: z.object({ data: z.string() }),
      });

      const provider = new EndpointSchemaProvider([notification, request]);
      const schema = provider.getSchema();

      const result = schema.safeParse({
        'test.notification': {
          type: 'notification',
          methodName: 'test.notification',
          params: { message: 'test' },
        },
        'test.request': {
          type: 'request',
          methodName: 'test.request',
          params: { id: 123 },
          response: { data: 'test' },
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error cases', () => {
    it('throws on unsupported endpoint type', () => {
      const invalidEndpoint = {
        type: 'invalid',
        methodName: 'test.invalid',
        paramsSchema: z.string(),
      } as never;

      const provider = new EndpointSchemaProvider([invalidEndpoint]);

      expect(() => provider.getSchema()).toThrow('Endpoint type not supported');
    });
  });
});

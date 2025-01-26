import { z } from 'zod';
import { JsonSchemaGenerator } from './json_schema_generator';
import { SchemaProvider } from './schema_provider';

class TestSchemaProvider implements SchemaProvider {
  readonly #schema: z.ZodType;

  readonly #description: string | undefined;

  constructor(schema: z.ZodType, description?: string) {
    this.#schema = schema;
    this.#description = description;
  }

  getSchema(): z.ZodType {
    if (this.#description) {
      return this.#schema.describe(this.#description);
    }
    return this.#schema;
  }
}

describe('JsonSchemaGenerator', () => {
  describe('schema generation', () => {
    it('generates empty schema with no providers', () => {
      const generator = new JsonSchemaGenerator({});
      const result = generator.generate();

      expect(result).toMatchObject({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {},
      });
    });

    it('generates schema from single provider', () => {
      const provider = new TestSchemaProvider(z.object({ value: z.string() }), 'Test Schema');

      const generator = new JsonSchemaGenerator({
        test: provider,
      });
      const result = generator.generate();

      expect(result).toMatchObject({
        type: 'object',
        properties: {
          test: {
            type: 'object',
            description: 'Test Schema',
            properties: {
              value: { type: 'string' },
            },
            required: ['value'],
          },
        },
        required: ['test'],
      });
    });
  });

  describe('multiple providers', () => {
    it('combines schemas from multiple providers', () => {
      const provider1 = new TestSchemaProvider(z.object({ value1: z.string() }), 'First Schema');

      const provider2 = new TestSchemaProvider(z.object({ value2: z.number() }), 'Second Schema');

      const generator = new JsonSchemaGenerator({
        schema1: provider1,
        schema2: provider2,
      });
      const result = generator.generate();

      expect(result).toMatchObject({
        type: 'object',
        properties: {
          schema1: {
            type: 'object',
            description: 'First Schema',
            properties: {
              value1: { type: 'string' },
            },
          },
          schema2: {
            type: 'object',
            description: 'Second Schema',
            properties: {
              value2: { type: 'number' },
            },
          },
        },
        required: ['schema1', 'schema2'],
      });
    });

    it('handles providers with complex schemas', () => {
      const provider = new TestSchemaProvider(
        z.object({
          id: z.number(),
          tags: z.array(z.string()),
          metadata: z.record(z.unknown()),
          status: z.enum(['active', 'inactive']),
          nested: z.object({
            field1: z.boolean(),
            field2: z.nullable(z.string()),
          }),
        }),
      );

      const generator = new JsonSchemaGenerator({
        complex: provider,
      });
      const result = generator.generate();

      expect(result).toMatchObject({
        type: 'object',
        properties: {
          complex: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
              metadata: {
                type: 'object',
                additionalProperties: {},
              },
              status: {
                type: 'string',
                enum: ['active', 'inactive'],
              },
              nested: {
                type: 'object',
                properties: {
                  field1: { type: 'boolean' },
                  field2: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('schema naming', () => {
    it('uses provider name as schema key', () => {
      const provider = new TestSchemaProvider(z.object({ value: z.string() }));

      const generator = new JsonSchemaGenerator({
        custom_name: provider,
      });
      const result = generator.generate();

      expect(result.properties).toHaveProperty('custom_name');
    });
  });
});

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SchemaProvider } from './schema_provider';

export interface JsonSchemaGeneratorOptions {
  title?: string;
  description?: string;
}

export class JsonSchemaGenerator {
  readonly #providers: Record<string, SchemaProvider>;

  constructor(providers: Record<string, SchemaProvider>) {
    this.#providers = providers;
  }

  generate(options: JsonSchemaGeneratorOptions = {}): Record<string, unknown> {
    const rootSchema = z.object(
      Object.entries(this.#providers).reduce(
        (acc, [key, provider]) => {
          acc[key] = provider.getSchema();
          return acc;
        },
        {} as Record<string, z.ZodType>,
      ),
    );

    if (options.title) {
      rootSchema.describe(options.title);
    }

    return zodToJsonSchema(rootSchema, {
      $refStrategy: 'none',
      target: 'jsonSchema7',
    });
  }
}

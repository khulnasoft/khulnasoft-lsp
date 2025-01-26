import { z } from 'zod';

export interface SchemaProvider {
  getSchema(): z.ZodType;
}

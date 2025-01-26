import { z } from 'zod';
import { NO_RESPONSE } from '../constants';
import { createRequestEndpoint } from './create_request_endpoint';

describe('createRequestEndpoint', () => {
  it('should return a valid request definition', () => {
    const paramsSchema = z.object({ id: z.number() });
    const responseSchema = z.object({ name: z.string() });
    const handle = jest.fn();

    const request = createRequestEndpoint({
      methodName: 'test-request',
      paramsSchema,
      responseSchema,
      handle,
    });

    expect(request.type).toBe('request');
    expect(request.methodName).toBe('test-request');
    expect(request.paramsSchema).toBe(paramsSchema);
    expect(request.responseSchema).toBe(responseSchema);
    expect(request.handle).toBe(handle);
  });

  it('should handle requests with no response', () => {
    const paramsSchema = z.object({ id: z.number() });
    const handle = jest.fn();

    const request = createRequestEndpoint({
      methodName: 'test-request',
      paramsSchema,
      responseSchema: NO_RESPONSE,
      handle,
    });

    expect(request.responseSchema.safeParse(undefined).success).toBe(true);
    expect(request.handle).toBe(handle);
  });
});

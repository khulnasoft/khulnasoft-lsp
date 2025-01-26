import { z } from 'zod';
import { NO_PARAMS, NO_RESPONSE } from '@khulnasoft/endpoint';
import { getEndpointMetadata } from '../metadata';
import { request } from './request';

describe('request decorator', () => {
  it('should set endpoint metadata with default schemas', () => {
    class TestClass {
      @request('test')
      testMethod() {}
    }

    const instance = new TestClass();
    const metadata = getEndpointMetadata(instance.testMethod);
    expect(metadata).toEqual({
      type: 'request',
      methodName: 'test',
      paramsSchema: NO_PARAMS,
      responseSchema: NO_RESPONSE,
    });
  });

  it('should set endpoint metadata with custom schemas', () => {
    const ParamsSchema = z.object({ input: z.string() });
    const ResponseSchema = z.object({ output: z.number() });

    class TestClass {
      @request('test', {
        paramsSchema: ParamsSchema,
        responseSchema: ResponseSchema,
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      testMethod(params: z.infer<typeof ParamsSchema>) {
        return {
          output: 1,
        };
      }
    }

    const instance = new TestClass();
    const metadata = getEndpointMetadata(instance.testMethod);
    expect(metadata).toEqual({
      type: 'request',
      methodName: 'test',
      paramsSchema: ParamsSchema,
      responseSchema: ResponseSchema,
    });
  });
});

import { z } from 'zod';
import { NO_PARAMS } from '@khulnasoft/endpoint';
import { getEndpointMetadata } from '../metadata';
import { notification } from './notification';

describe('notification decorator', () => {
  it('should set endpoint metadata with default params schema', () => {
    class TestClass {
      @notification('test')
      testMethod() {}
    }

    const instance = new TestClass();
    const metadata = getEndpointMetadata(instance.testMethod);
    expect(metadata).toEqual({
      type: 'notification',
      methodName: 'test',
      paramsSchema: NO_PARAMS,
    });
  });

  it('should set endpoint metadata with custom params schema', () => {
    const TestSchema = z.object({ test: z.string() });

    class TestClass {
      @notification('test', { paramsSchema: TestSchema })
      testMethod() {}
    }

    const instance = new TestClass();
    const metadata = getEndpointMetadata(instance.testMethod);
    expect(metadata).toEqual({
      type: 'notification',
      methodName: 'test',
      paramsSchema: TestSchema,
    });
  });
});

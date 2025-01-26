import { z } from 'zod';
import { Controller } from './controller';
import { controller, notification, request } from './decorators';

const ExampleNotificationParamsSchema = z.object({ a: z.string() });
const ExampleRequestParamsSchema = z.object({ a: z.string() });
const ExampleRequestResponseSchema = z.string();

@controller({
  route: '$/gitlab/example',
})
export class Test extends Controller {
  @notification('exampleNotification', {
    paramsSchema: ExampleNotificationParamsSchema,
  })
  async exampleNotification(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: z.infer<typeof ExampleNotificationParamsSchema>,
  ): Promise<void> {
    // console.log('exampleNotification:', params);
  }

  @request('exampleRequest', {
    paramsSchema: ExampleRequestParamsSchema,
    responseSchema: ExampleRequestResponseSchema,
  })
  async exampleRequest(params: z.infer<typeof ExampleRequestParamsSchema>) {
    return params.a;
  }
}

describe('Controller', () => {
  describe('getEndpoints', () => {
    it('can get metadata from methods', () => {
      const test = new Test();
      const endpoints = test.getEndpoints();

      expect(endpoints).toHaveLength(2);

      const notificationEndpoint = endpoints.find((e) => e.type === 'notification');
      expect(notificationEndpoint).toBeDefined();
      expect(notificationEndpoint?.methodName).toBe('$/gitlab/example/exampleNotification');
      expect(notificationEndpoint?.paramsSchema).toBe(ExampleNotificationParamsSchema);

      const requestEndpoint = endpoints.find((e) => e.type === 'request');
      expect(requestEndpoint).toBeDefined();
      expect(requestEndpoint?.methodName).toBe('$/gitlab/example/exampleRequest');
      expect(requestEndpoint?.paramsSchema).toBe(ExampleRequestParamsSchema);
      expect(requestEndpoint?.responseSchema).toBe(ExampleRequestResponseSchema);
    });

    it('should work with inherited methods', () => {
      class BaseController extends Controller {
        @request('base')
        baseMethod() {}
      }

      class DerivedController extends BaseController {
        @request('derived')
        derivedMethod() {}
      }

      const testController = new DerivedController();
      const endpoints = testController.getEndpoints();

      expect(endpoints).toHaveLength(2);
      expect(endpoints.map((e) => e.methodName)).toEqual(['derived', 'base']);
    });
  });
});

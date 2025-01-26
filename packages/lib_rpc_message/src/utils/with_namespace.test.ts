import { RpcMessageDefinition } from '../types';
import { NO_PARAMS, NO_RESPONSE } from '../constants';
import { withNamespace } from './with_namespace';

describe('withNamespace', () => {
  it('should add a namespace to each message methodName', () => {
    const messages: RpcMessageDefinition[] = [
      {
        methodName: 'test-one',
        type: 'notification',
        paramsSchema: NO_PARAMS,
      },
      {
        methodName: 'test-two',
        type: 'request',
        paramsSchema: NO_PARAMS,
        responseSchema: NO_RESPONSE,
      },
    ];

    const namespacedMessages = withNamespace('namespace', messages);

    expect(namespacedMessages[0].methodName).toBe('namespace/test-one');
    expect(namespacedMessages[1].methodName).toBe('namespace/test-two');
  });

  it('should handle an empty namespace', () => {
    const messages: RpcMessageDefinition[] = [
      {
        methodName: 'test-one',
        type: 'notification',
        paramsSchema: NO_PARAMS,
      },
    ];

    const namespacedMessages = withNamespace('', messages);

    expect(namespacedMessages[0].methodName).toBe('/test-one');
  });
});

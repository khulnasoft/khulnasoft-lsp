import { Socket } from 'socket.io-client';
import { MessageMap } from '@khulnasoft/message-bus';
import { generateRequestId } from '../../generate_request_id';
import {
  SocketIoMessageBus,
  SOCKET_NOTIFICATION_CHANNEL,
  SOCKET_REQUEST_CHANNEL,
  SOCKET_RESPONSE_CHANNEL,
  SocketEvents,
  REQUEST_TIMEOUT_MS,
} from './socket_io_message_bus';

jest.mock('../../generate_request_id');

interface TestMessageMap extends MessageMap {
  inbound: {
    notifications: {
      testNotification: string;
    };
    requests: {
      testRequest: {
        params: number;
        result: string;
      };
    };
  };
  outbound: {
    notifications: {
      testOutboundNotification: boolean;
    };
    requests: {
      testOutboundRequest: {
        params: string;
        result: number;
      };
    };
  };
}

const TEST_REQUEST_ID = 'mock-request-id';

describe('SocketIoMessageBus', () => {
  let mockSocket: jest.Mocked<Socket>;
  let messageBus: SocketIoMessageBus<TestMessageMap>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(generateRequestId).mockReturnValue(TEST_REQUEST_ID);

    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as jest.Mocked<Socket>;

    messageBus = new SocketIoMessageBus<TestMessageMap>(mockSocket);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('sendNotification', () => {
    it('should emit a notification event', async () => {
      // Arrange
      const messageType = 'testOutboundNotification';
      const payload = true;

      // Act
      await messageBus.sendNotification(messageType, payload);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('notification', {
        type: messageType,
        payload,
      });
    });
  });

  describe('sendRequest', () => {
    it('should emit a request event and resolve with the response', async () => {
      // Arrange
      const messageType = 'testOutboundRequest';
      const payload = 'test';
      const response = 42;

      // Act
      const promise = messageBus.sendRequest(messageType, payload);

      // Simulate response
      const handleResponse = getSocketEventHandler(mockSocket, SOCKET_RESPONSE_CHANNEL);
      handleResponse({ requestId: TEST_REQUEST_ID, payload: response });

      // Assert
      await expect(promise).resolves.toBe(response);
      expect(mockSocket.emit).toHaveBeenCalledWith('request', {
        requestId: TEST_REQUEST_ID,
        type: messageType,
        payload,
      });
    });

    it('should reject if the request times out', async () => {
      // Arrange
      const messageType = 'testOutboundRequest';
      const payload = 'test';

      // Act
      const promise = messageBus.sendRequest(messageType, payload);

      // Simulate timeout
      jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);

      // Assert
      await expect(promise).rejects.toThrow('Request timed out');
    });
  });

  describe('onNotification', () => {
    it('should register a notification handler', () => {
      // Arrange
      const messageType = 'testNotification';
      const handler = jest.fn();

      // Act
      messageBus.onNotification(messageType, handler);

      // Simulate incoming notification
      const handleNotification = getSocketEventHandler(mockSocket, SOCKET_NOTIFICATION_CHANNEL);
      handleNotification({ type: messageType, payload: 'test' });

      // Assert
      expect(handler).toHaveBeenCalledWith('test');
    });
  });

  describe('onRequest', () => {
    it('should register a request handler', async () => {
      // Arrange
      const messageType = 'testRequest';
      const handler = jest.fn().mockResolvedValue('response');

      // Act
      messageBus.onRequest(messageType, handler);

      // Simulate incoming request
      const handleRequest = getSocketEventHandler(mockSocket, SOCKET_REQUEST_CHANNEL);
      await handleRequest({
        requestId: 'test-id',
        event: messageType,
        payload: 42,
      });

      // Assert
      expect(handler).toHaveBeenCalledWith(42);
      expect(mockSocket.emit).toHaveBeenCalledWith('response', {
        requestId: 'test-id',
        payload: 'response',
      });
    });
  });

  describe('dispose', () => {
    it('should remove all event listeners', () => {
      // Act
      messageBus.dispose();

      // Assert
      expect(mockSocket.off).toHaveBeenCalledTimes(3);
      expect(mockSocket.off).toHaveBeenCalledWith('notification', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('request', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('response', expect.any(Function));
    });
  });
});

// eslint-disable-next-line @typescript-eslint/ban-types
function getSocketEventHandler(socket: jest.Mocked<Socket>, eventName: SocketEvents): Function {
  const [, handler] = socket.on.mock.calls.find((call) => call[0] === eventName)!;
  return handler;
}

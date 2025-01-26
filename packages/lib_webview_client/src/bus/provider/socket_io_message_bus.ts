import { MessageMap, MessageBus, ExtractRequestResult } from '@khulnasoft/message-bus';
import { SimpleRegistry } from '@khulnasoft/handler-registry';
import { Socket } from 'socket.io-client';
import { Disposable } from '@khulnasoft/disposable';
import { generateRequestId } from '../../generate_request_id';

export const REQUEST_TIMEOUT_MS = 10000;
export const SOCKET_NOTIFICATION_CHANNEL = 'notification';
export const SOCKET_REQUEST_CHANNEL = 'request';
export const SOCKET_RESPONSE_CHANNEL = 'response';

export type SocketEvents =
  | typeof SOCKET_NOTIFICATION_CHANNEL
  | typeof SOCKET_REQUEST_CHANNEL
  | typeof SOCKET_RESPONSE_CHANNEL;

export class SocketIoMessageBus<TMessages extends MessageMap> implements MessageBus<TMessages> {
  #notificationHandlers = new SimpleRegistry();

  #requestHandlers = new SimpleRegistry();

  #pendingRequests = new SimpleRegistry();

  #socket: Socket;

  constructor(socket: Socket) {
    this.#socket = socket;

    this.#setupSocketEventHandlers();
  }

  async sendNotification<T extends keyof TMessages['outbound']['notifications']>(
    messageType: T,
    payload?: TMessages['outbound']['notifications'][T],
  ): Promise<void> {
    this.#socket.emit(SOCKET_NOTIFICATION_CHANNEL, { type: messageType, payload });
  }

  sendRequest<T extends keyof TMessages['outbound']['requests'] & string>(
    type: T,
    payload?: TMessages['outbound']['requests'][T]['params'],
  ): Promise<ExtractRequestResult<TMessages['outbound']['requests'][T]>> {
    const requestId = generateRequestId();
    let timeout: NodeJS.Timeout | undefined;

    return new Promise((resolve, reject) => {
      const pendingRequestDisposable = this.#pendingRequests.register(
        requestId,
        (value: ExtractRequestResult<TMessages['outbound']['requests'][T]>) => {
          resolve(value);
          clearTimeout(timeout);
          pendingRequestDisposable.dispose();
        },
      );

      timeout = setTimeout(() => {
        pendingRequestDisposable.dispose();
        reject(new Error('Request timed out'));
      }, REQUEST_TIMEOUT_MS);

      this.#socket.emit(SOCKET_REQUEST_CHANNEL, {
        requestId,
        type,
        payload,
      });
    });
  }

  onNotification<T extends keyof TMessages['inbound']['notifications'] & string>(
    messageType: T,
    callback: (payload: TMessages['inbound']['notifications'][T]) => void,
  ): Disposable {
    return this.#notificationHandlers.register(messageType, callback);
  }

  onRequest<T extends keyof TMessages['inbound']['requests'] & string>(
    type: T,
    handler: (
      payload: TMessages['inbound']['requests'][T]['params'],
    ) => Promise<ExtractRequestResult<TMessages['inbound']['requests'][T]>>,
  ): Disposable {
    return this.#requestHandlers.register(type, handler);
  }

  dispose() {
    this.#socket.off(SOCKET_NOTIFICATION_CHANNEL, this.#handleNotificationMessage);
    this.#socket.off(SOCKET_REQUEST_CHANNEL, this.#handleRequestMessage);
    this.#socket.off(SOCKET_RESPONSE_CHANNEL, this.#handleResponseMessage);
    this.#notificationHandlers.dispose();
    this.#requestHandlers.dispose();
    this.#pendingRequests.dispose();
  }

  #setupSocketEventHandlers = () => {
    this.#socket.on(SOCKET_NOTIFICATION_CHANNEL, this.#handleNotificationMessage);
    this.#socket.on(SOCKET_REQUEST_CHANNEL, this.#handleRequestMessage);
    this.#socket.on(SOCKET_RESPONSE_CHANNEL, this.#handleResponseMessage);
  };

  #handleNotificationMessage = async (message: {
    type: keyof TMessages['inbound']['notifications'] & string;
    payload: unknown;
  }) => {
    await this.#notificationHandlers.handle(message.type, message.payload);
  };

  #handleRequestMessage = async (message: {
    requestId: string;
    event: keyof TMessages['inbound']['requests'] & string;
    payload: unknown;
  }) => {
    const response = await this.#requestHandlers.handle(message.event, message.payload);
    this.#socket.emit(SOCKET_RESPONSE_CHANNEL, {
      requestId: message.requestId,
      payload: response,
    });
  };

  #handleResponseMessage = async (message: { requestId: string; payload: unknown }) => {
    await this.#pendingRequests.handle(message.requestId, message.payload);
  };
}

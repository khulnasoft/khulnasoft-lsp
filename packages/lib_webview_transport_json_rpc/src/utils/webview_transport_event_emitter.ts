import { EventEmitter } from 'events';
import { MessagesToServer } from '@khulnasoft/webview-transport';
import TypedEmitter from 'typed-emitter';

export type WebviewTransportEventEmitterMessages = {
  [K in keyof MessagesToServer]: (payload: MessagesToServer[K]) => void;
};

export type WebviewTransportEventEmitter = TypedEmitter<WebviewTransportEventEmitterMessages>;

export const createWebviewTransportEventEmitter = (): WebviewTransportEventEmitter =>
  new EventEmitter() as WebviewTransportEventEmitter;

import { WebviewAddress } from '@khulnasoft/webview-plugin';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { MessageBus } from './message_bus';

export type WebviewRuntimeSystemNotificationMessage = {
  type: string;
  payload?: unknown;
};

export type WebviewRuntimeNotificationMessage = WebviewAddress & {
  type: string;
  payload?: unknown;
};

export type WebviewRuntimeRequestMessage = WebviewRuntimeNotificationMessage & {
  requestId: string;
};

type SuccessfulResponse = WebviewAddress & {
  requestId: string;
  success: true;
  type: string;
  payload?: unknown;
};

type FailedResponse = WebviewAddress & {
  requestId: string;
  success: false;
  reason: string;
  type: string;
};

export type WebviewRuntimeResponseMessage = SuccessfulResponse | FailedResponse;

export type WebviewRuntimeMessages = {
  'webview:connect': WebviewAddress;
  'webview:disconnect': WebviewAddress;
  'webview:notification': WebviewRuntimeNotificationMessage;
  'webview:request': WebviewRuntimeRequestMessage;
  'webview:response': WebviewRuntimeResponseMessage;
  'plugin:notification': WebviewRuntimeNotificationMessage;
  'plugin:request': WebviewRuntimeRequestMessage;
  'plugin:response': WebviewRuntimeResponseMessage;
  'system:notification': WebviewRuntimeSystemNotificationMessage;
};

export interface WebviewRuntimeMessageBus extends MessageBus<WebviewRuntimeMessages> {}
export const WebviewRuntimeMessageBus = createInterfaceId<WebviewRuntimeMessageBus>(
  'WebviewRuntimeMessageBus',
);

@Injectable(WebviewRuntimeMessageBus, [])
export class DefaultWebviewRuntimeMessageBus extends MessageBus<WebviewRuntimeMessages> {}

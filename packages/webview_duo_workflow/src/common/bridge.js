import { messageBus } from '../app/message_bus.ts';

export function sendRequest(eventName, payload) {
  messageBus.sendNotification(eventName, payload);
}

export function sendGraphqlRequest(payload) {
  messageBus.sendNotification('getGraphqlData', payload);
}

export function setResponseListener(eventName, callback) {
  messageBus.onNotification(eventName, callback);
}

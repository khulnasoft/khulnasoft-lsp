import { messageBus } from '../app/message_bus.ts';
import { sendRequest, setResponseListener } from './bridge';

jest.mock('../app/message_bus.ts');

describe('bridge', () => {
  describe('sendRequest', () => {
    it('calls messageBus.sendNotification with correct parameters', () => {
      const eventName = 'getWorkflowById';
      const payload = { data: 'testData' };

      sendRequest(eventName, payload);

      expect(messageBus.sendNotification).toHaveBeenCalledWith(eventName, payload);
    });
  });

  describe('setResponseListener', () => {
    it('calls messageBus.onNotification with correct parameters', () => {
      const eventName = 'setProjectPath';
      const callback = jest.fn();

      setResponseListener(eventName, callback);

      expect(messageBus.onNotification).toHaveBeenCalledWith(eventName, callback);
    });
  });
});

import { registerControllers } from './setup';

describe('setup controllers', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMessageBus: any;

  beforeEach(() => {
    mockMessageBus = {
      onNotification: jest.fn(),
      sendNotification: jest.fn(),
    };
  });
  // WRite tests for the setup.ts file next to this one in the directory
  describe('registerControllers', () => {
    it('should register controllers with the message bus', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      registerControllers(mockMessageBus, [mockCallback1, mockCallback2]);

      expect(mockMessageBus.onNotification).toHaveBeenCalledTimes(2);
      expect(mockMessageBus.onNotification).toHaveBeenCalledWith(
        mockCallback1.name,
        expect.any(Function),
      );
      expect(mockMessageBus.onNotification).toHaveBeenCalledWith(
        mockCallback2.name,
        expect.any(Function),
      );
    });

    it('should handle single response from callback', async () => {
      const mockCallback = jest
        .fn()
        .mockResolvedValue({ eventName: 'testEvent', data: 'testData' });

      registerControllers(mockMessageBus, [mockCallback]);

      const registeredCallback = mockMessageBus.onNotification.mock.calls[0][1];
      await registeredCallback();

      expect(mockMessageBus.sendNotification).toHaveBeenCalledWith('testEvent', 'testData');
    });

    it('should handle multiple responses from callback', async () => {
      const mockCallback = jest.fn().mockResolvedValue([
        { eventName: 'testEvent1', data: 'testData1' },
        { eventName: 'testEvent2', data: 'testData2' },
      ]);

      registerControllers(mockMessageBus, [mockCallback]);

      const registeredCallback = mockMessageBus.onNotification.mock.calls[0][1];
      await registeredCallback();

      expect(mockMessageBus.sendNotification).toHaveBeenCalledTimes(2);
      expect(mockMessageBus.sendNotification).toHaveBeenCalledWith('testEvent1', 'testData1');
      expect(mockMessageBus.sendNotification).toHaveBeenCalledWith('testEvent2', 'testData2');
    });

    it('should not send notification for "noreply" response', async () => {
      const mockCallback = jest.fn().mockResolvedValue('noreply');

      registerControllers(mockMessageBus, [mockCallback]);

      const registeredCallback = mockMessageBus.onNotification.mock.calls[0][1];
      await registeredCallback();

      expect(mockMessageBus.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send the workflowError message when the callback is successful', async () => {
      const mockCallback = jest
        .fn()
        .mockResolvedValue({ eventName: 'testEvent', data: 'testData' });
      registerControllers(mockMessageBus, [mockCallback]);

      const registeredCallback = mockMessageBus.onNotification.mock.calls[0][1];
      await registeredCallback();
      expect(mockMessageBus.sendNotification).not.toHaveBeenCalledWith(
        'workflowError',
        expect.anything(),
      );
    });

    describe('when there is an error in the callback', () => {
      it('should send a workflowError notification with the error message', async () => {
        const mockCallback = jest.fn().mockRejectedValue(new Error('Test error'));

        registerControllers(mockMessageBus, [mockCallback]);

        const registeredCallback = mockMessageBus.onNotification.mock.calls[0][1];
        await registeredCallback();

        expect(mockMessageBus.sendNotification).toHaveBeenCalledWith('workflowError', 'Test error');
      });
    });
  });
});

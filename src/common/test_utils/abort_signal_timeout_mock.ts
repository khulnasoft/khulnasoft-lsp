type AbortSignalTimeoutMockUtils = {
  setupAbortSignalTimeoutMock: () => void;
  teardownAbortSignalTimeoutMock: () => void;
};

/**
 * Mocks the `AbortSignal.timeout()` function.
 * This is because jest `useFakeTimers` / `runAllTimers` does not work out of the box when using `AbortSignal.timeout()`.
 *
 * @example
 * jest.useFakeTimers();
 * describe('Example', () => {
 *   const { setupAbortSignalTimeoutMock, teardownAbortSignalTimeoutMock } = mockAbortSignalTimeout();
 *
 *   beforeEach(setupAbortSignalTimeoutMock);
 *   afterEach(teardownAbortSignalTimeoutMock);
 *
 *    it('times out', async () => {
 *      const promise = doThingWithTimeout();
 *      jest.runAllTimers();
 *      await expect(promise).rejects.toThrow('The operation was aborted due to timeout');
 *    });
 *  });
 */
export function mockAbortSignalTimeout(): AbortSignalTimeoutMockUtils {
  let originalAbortSignalTimeout: typeof AbortSignal.timeout;
  let mockSignalTimeout: NodeJS.Timeout;

  return {
    setupAbortSignalTimeoutMock: () => {
      originalAbortSignalTimeout = AbortSignal.timeout;
      AbortSignal.timeout = (delay: number) => {
        const controller = new AbortController();
        mockSignalTimeout = setTimeout(() => {
          const error = new Error('The operation was aborted due to timeout');
          error.name = 'TimeoutError';
          controller.abort(error);
        }, delay);
        return controller.signal;
      };
    },
    teardownAbortSignalTimeoutMock: () => {
      AbortSignal.timeout = originalAbortSignalTimeout;
      if (mockSignalTimeout) {
        clearTimeout(mockSignalTimeout);
      }
    },
  };
}

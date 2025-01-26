import { setActivePinia, createPinia } from 'pinia';
import { useRequestErrorStore } from './request_error';

describe('useRequestErrorStore', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useRequestErrorStore();
  });

  it('initializes with null requestError', () => {
    expect(store.requestError).toBeNull();
  });

  describe('setRequestError', () => {
    it('sets the requestError', () => {
      const error = 'Test error message';
      store.setRequestError(error);
      expect(store.requestError).toBe(error);
    });
  });

  describe('resetRequestError', () => {
    it('resets the requestError to null', () => {
      store.setRequestError('Test error');
      store.resetRequestError();
      expect(store.requestError).toBeNull();
    });
  });
});

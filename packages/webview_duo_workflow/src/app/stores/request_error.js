import { defineStore } from 'pinia';

export const useRequestErrorStore = defineStore('requestError', {
  state: () => ({
    requestError: null,
  }),
  actions: {
    setRequestError(error) {
      this.requestError = error;
    },
    resetRequestError() {
      this.requestError = null;
    },
  },
  events: {
    workflowError: 'setRequestError',
  },
});

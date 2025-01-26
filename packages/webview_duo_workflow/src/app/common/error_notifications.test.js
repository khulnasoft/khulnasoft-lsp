import { GlAlert } from '@khulnasoft/ui';
import { createTestingPinia } from '@pinia/testing';
import { shallowMount } from '@vue/test-utils';
import { useRequestErrorStore } from '../stores/request_error';
import ErrorNotifications from './error_notifications.vue';

describe('ErrorNotifications', () => {
  let wrapper;
  let store;

  const createComponent = (initialState = {}) => {
    wrapper = shallowMount(ErrorNotifications, {
      pinia: createTestingPinia(),
    });

    store = useRequestErrorStore();
    if (initialState.requestError) {
      store.requestError = initialState.requestError;
    }
  };

  const findAlert = () => wrapper.findComponent(GlAlert);

  describe('when requestError is null', () => {
    beforeEach(() => {
      createComponent();
    });

    it('does not render error message when requestError is null', () => {
      expect(findAlert().exists()).toBe(false);
    });
  });

  describe('when there is a requestError', () => {
    beforeEach(() => {
      createComponent({ requestError: 'An error occurred' });
    });

    it('renders error message', () => {
      expect(findAlert().exists()).toBe(true);
      expect(findAlert().text()).toContain('An error occurred');
    });

    describe('when dismissing the error', () => {
      beforeEach(async () => {
        await findAlert().vm.$emit('dismiss');
      });

      it('emits requestError event when close button is clicked', async () => {
        expect(wrapper.emitted('request-error')).toBeTruthy();
      });
    });
  });
});

import { createPinia, PiniaVuePlugin } from 'pinia';
import Vue from 'vue';
import VueRouter from 'vue-router';
import { GlToast } from '@khulnasoft/ui';
import { resolveMessageBus } from '@khulnasoft/webview-client';
import { WEBVIEW_ID } from '../contract';
import App from './app.vue';
import { createRouter } from './router';
import { setWorkflowStoreEvents } from './stores/plugins/workflow_store_events_plugin';

resolveMessageBus({
  webviewId: WEBVIEW_ID,
});

Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(GlToast);
Vue.use(PiniaVuePlugin);

const pinia = createPinia();
pinia.use(setWorkflowStoreEvents);

const router = createRouter() as VueRouter;

const el: HTMLElement | null = document.getElementById('app');

if (el) {
  new Vue({
    el,
    router,
    pinia,
    render(createElement) {
      return createElement(App);
    },
  }).$mount();
}

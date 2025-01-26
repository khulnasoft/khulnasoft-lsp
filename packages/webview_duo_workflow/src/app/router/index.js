import VueRouter from 'vue-router';
import { createRoutes } from './routes';

export function createRouter(base = '/webview/duo-workflow/') {
  return new VueRouter({
    base,
    mode: 'hash',
    routes: createRoutes(),
  });
}

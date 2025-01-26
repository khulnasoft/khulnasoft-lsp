import path from 'path';
import { WebviewId } from '@khulnasoft/webview-plugin';
import { FastifyPluginRegistration } from '../http';
import { WebviewHtmlTransformer } from '../../common/webview/html';
import { WEBVIEW_BASE_PATH } from './constants';

import { setupWebviewRoutes } from './routes';

type Options = {
  webviewIds: WebviewId[];
  webviewHtmlTransformer: WebviewHtmlTransformer;
};

export const createWebviewPlugin = (options: Options): FastifyPluginRegistration => ({
  plugin: (fastify, { webviewIds, webviewHtmlTransformer }) =>
    setupWebviewRoutes(fastify, {
      webviewIds,
      getWebviewResourcePath: buildWebviewPath,
      webviewHtmlTransformer,
    }),
  options,
});

const buildWebviewPath = (webviewId: WebviewId) => path.join(WEBVIEW_BASE_PATH, webviewId);

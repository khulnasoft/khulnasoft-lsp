import { WebviewId } from '@khulnasoft/webview-plugin';
import { FastifyInstance } from 'fastify';
import { WebviewHtmlTransformer } from '../../../common/webview/html';
import { registerStaticPluginSafely } from '../../http';
import {
  buildWebviewCollectionMetadataRequestHandler,
  buildWebviewRequestHandler,
} from '../handlers';

type SetupWebviewRoutesOptions = {
  webviewIds: WebviewId[];
  getWebviewResourcePath: (webviewId: WebviewId) => string;
  webviewHtmlTransformer: WebviewHtmlTransformer;
};

export const setupWebviewRoutes = async (
  fastify: FastifyInstance,
  { webviewIds, getWebviewResourcePath, webviewHtmlTransformer }: SetupWebviewRoutesOptions,
): Promise<void> => {
  await fastify.register(
    async (instance) => {
      instance.get('/', buildWebviewCollectionMetadataRequestHandler(webviewIds));
      instance.get(
        '/:webviewId',
        buildWebviewRequestHandler(webviewIds, getWebviewResourcePath, webviewHtmlTransformer),
      );

      // registering static resources across multiple webviews should not be done in parallel since we need to ensure that the fastify instance has been modified by the static files plugin
      for (const webviewId of webviewIds) {
        // eslint-disable-next-line no-await-in-loop
        await registerStaticPluginSafely(instance, {
          root: getWebviewResourcePath(webviewId),
          prefix: `/${webviewId}/`,
        });
      }
    },
    { prefix: '/webview' },
  );
};

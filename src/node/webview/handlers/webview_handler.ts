import fs from 'fs/promises';
import path from 'path';
import { WebviewId } from '@khulnasoft/webview-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';
import { withTrailingSlashRedirect } from '../../http';
import { WebviewHtmlTransformer } from '../../../common/webview/html';

export const buildWebviewRequestHandler = (
  webviewIds: WebviewId[],
  getWebviewResourcePath: (webviewId: WebviewId) => string,
  webviewHtmlTransformer: WebviewHtmlTransformer,
): RouteHandlerMethod => {
  return withTrailingSlashRedirect(
    withKnownWebview(webviewIds, async (request: FastifyRequest, reply: FastifyReply) => {
      const { webviewId } = request.params as { webviewId: WebviewId };
      const webviewPath = getWebviewResourcePath(webviewId);
      try {
        const indexHtmlPath = path.join(webviewPath, 'index.html');
        let htmlContent = await fs.readFile(indexHtmlPath, 'utf8');
        htmlContent = webviewHtmlTransformer.transformHtml(htmlContent);

        await reply.type('text/html').send(htmlContent);
      } catch (error) {
        request.log.error(error, 'Error loading webview content');
        await reply.status(500).send('Failed to load the webview content.');
      }
    }),
  );
};

export const withKnownWebview = (
  webviewIds: WebviewId[],
  handler: RouteHandlerMethod,
): RouteHandlerMethod => {
  return function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    const { webviewId } = request.params as { webviewId: WebviewId };

    if (!webviewIds.includes(webviewId)) {
      return reply.status(404).send(`Unknown webview: ${webviewId}`);
    }

    return handler.call(this, request, reply);
  };
};

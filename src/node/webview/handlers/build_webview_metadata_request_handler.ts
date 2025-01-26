import { WebviewId } from '@khulnasoft/webview-plugin';
import { FastifyRequest, FastifyReply } from 'fastify';

export const buildWebviewCollectionMetadataRequestHandler = (
  webviewIds: WebviewId[],
): ((req: FastifyRequest, reply: FastifyReply) => Promise<void>) => {
  return async (_, reply) => {
    const urls = webviewIds.reduce(
      (acc, webviewId) => {
        acc[webviewId] = `/webview/${webviewId}/`;
        return acc;
      },
      {} as Record<WebviewId, string>,
    );
    await reply.send(urls);
  };
};

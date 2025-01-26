import { WebviewId } from '@khulnasoft/webview-plugin';
import {} from 'jest-mock';
import { createMockFastifyReply } from '../test-utils/mock_fastify_reply';
import { createMockFastifyRequest } from '../test-utils/mock_fastify_request';
import { buildWebviewCollectionMetadataRequestHandler } from './build_webview_metadata_request_handler';

describe('buildWebviewCollectionMetadataRequestHandler', () => {
  it('should return correct URLs for provided webview IDs', async () => {
    const webviewIds = ['webview1' as WebviewId, 'webview2' as WebviewId];
    const handler = buildWebviewCollectionMetadataRequestHandler(webviewIds);

    const reply = createMockFastifyReply();
    const request = createMockFastifyRequest({});

    await handler(request, reply);

    expect(reply.send).toHaveBeenCalledWith({
      webview1: '/webview/webview1/',
      webview2: '/webview/webview2/',
    });
  });
});

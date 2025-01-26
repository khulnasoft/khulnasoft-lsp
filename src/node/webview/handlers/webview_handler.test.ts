import fs from 'fs/promises';
import path from 'path';
import { WebviewId } from '@khulnasoft/webview-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { createMockFastifyReply } from '../test-utils/mock_fastify_reply';
import { createMockFastifyRequest } from '../test-utils/mock_fastify_request';
import { buildWebviewRequestHandler } from './webview_handler';

jest.mock('fs/promises');

describe('Webview Request Handler', () => {
  const webviewIds = ['webview1', 'webview2'] as WebviewId[];
  const getPath = jest.fn((id: string) => `/path/to/webviews/${id}`);

  const mockTransformHtml = jest.fn((html: string) => `<transformed>${html}</transformed>`);

  const handler = buildWebviewRequestHandler(webviewIds, getPath, {
    transformHtml: mockTransformHtml,
  });

  describe('without trailing slash', () => {
    let webviewId: WebviewId;
    let request: FastifyRequest;
    let reply: ReturnType<typeof createMockFastifyReply>;

    beforeEach(() => {
      [webviewId] = webviewIds;
      reply = createMockFastifyReply();
      request = createMockFastifyRequest({
        url: `/webview/${webviewId}`,
        params: { webviewId },
      });
    });

    it('redirect to the same URL with a trailing slash', async () => {
      await handler.bind(this as unknown as FastifyInstance)(request, reply);
      expect(reply.redirect).toHaveBeenCalledWith(`/webview/${webviewId}/`);
    });
  });

  describe('with trailing slash', () => {
    let webviewId: WebviewId;
    let request: FastifyRequest;
    let reply: ReturnType<typeof createMockFastifyReply>;
    let htmlContent: string;

    beforeEach(() => {
      [webviewId] = webviewIds;
      reply = createMockFastifyReply();
      request = createMockFastifyRequest({
        url: `/webview/${webviewId}/`,
        params: { webviewId },
      });
      htmlContent = '<html><body>Original Content</body></html>';

      // Mock fs.readFile to return the HTML content
      (fs.readFile as jest.Mock).mockResolvedValue(htmlContent);
    });

    it('correctly serves the transformed HTML for a known webview ID', async () => {
      await handler.bind({} as FastifyInstance)(request, reply);

      expect(getPath).toHaveBeenCalledWith(webviewId);

      const expectedIndexHtmlPath = path.join(`/path/to/webviews/${webviewId}`, 'index.html');
      expect(fs.readFile).toHaveBeenCalledWith(expectedIndexHtmlPath, 'utf8');

      expect(mockTransformHtml).toHaveBeenCalledWith(htmlContent);

      expect(reply.type).toHaveBeenCalledWith('text/html');
      expect(reply.send).toHaveBeenCalledWith(`<transformed>${htmlContent}</transformed>`);
      expect(reply.status).not.toHaveBeenCalledWith(404);
    });

    it('returns 500 if an error occurs while reading the file', async () => {
      const error = new Error('File read error');
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await handler.bind({} as FastifyInstance)(request, reply);

      expect(fs.readFile).toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith('Failed to load the webview content.');
    });

    it('returns 404 for an unknown webview ID', async () => {
      request = createMockFastifyRequest({
        url: '/webview/unknownId/',
        params: { webviewId: 'unknownId' },
      });
      reply = createMockFastifyReply();

      await handler.bind({} as FastifyInstance)(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith('Unknown webview: unknownId');
    });
  });
});

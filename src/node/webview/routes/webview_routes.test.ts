import { FastifyInstance } from 'fastify';
import { WebviewId } from '@khulnasoft/webview-plugin';
import { createMockFastifyReply } from '../test-utils/mock_fastify_reply';
import {
  MockFastifyInstance,
  createMockFastifyInstance,
} from '../test-utils/mock_fastify_instance';
import { setupWebviewRoutes } from './webview_routes';

const webviewIds = ['webview1', 'webview2'] as WebviewId[];
const getWebviewResourcePath = jest.fn((id) => `/fake/path/${id}`);

describe('setupWebviewRoutes', () => {
  let fastify: MockFastifyInstance & FastifyInstance;

  beforeEach(() => {
    fastify = createMockFastifyInstance();
    fastify.hasReplyDecorator = jest.fn().mockReturnValue(true);
  });

  it('register routes correctly', async () => {
    await setupWebviewRoutes(fastify, {
      webviewIds,
      getWebviewResourcePath,
      webviewHtmlTransformer: {
        transformHtml: (html) => html,
      },
    });

    // Check if '/webview/' route is registered
    expect(fastify.register).toHaveBeenCalledWith(expect.any(Function), { prefix: '/webview' });

    // Simulate calling the registered function with an instance
    const registeredFunction = fastify.register.mock.calls[0][0];
    await registeredFunction(fastify);

    // Check that specific routes are registered
    expect(fastify.get).toHaveBeenCalledWith('/', expect.any(Function));
    expect(fastify.get).toHaveBeenCalledWith('/:webviewId', expect.any(Function));
  });

  it('handle static content registration for each webview', async () => {
    await setupWebviewRoutes(fastify, {
      webviewIds,
      getWebviewResourcePath,
      webviewHtmlTransformer: {
        transformHtml: (html) => html,
      },
    });

    const registeredFunction = fastify.register.mock.calls[0][0];
    await registeredFunction(fastify);

    // Check static registration calls
    webviewIds.forEach((id) => {
      expect(getWebviewResourcePath).toHaveBeenCalledWith(id);
    });
  });

  it('respond correctly at the webview metadata endpoint', async () => {
    await setupWebviewRoutes(fastify, {
      webviewIds,
      getWebviewResourcePath,
      webviewHtmlTransformer: {
        transformHtml: (html) => html,
      },
    });

    const registeredFunction = fastify.register.mock.calls[0][0];
    await registeredFunction(fastify);

    // Simulate a request to the metadata endpoint
    const metadataHandler = fastify.get.mock.calls.find((call) => call[0] === '/')[1];
    const reply = createMockFastifyReply();

    await metadataHandler({}, reply);
    expect(reply.send).toHaveBeenCalledWith({
      webview1: '/webview/webview1/',
      webview2: '/webview/webview2/',
    });
  });
});

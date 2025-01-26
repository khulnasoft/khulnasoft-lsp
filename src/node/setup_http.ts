import { WebviewId, WebviewPlugin } from '@khulnasoft/webview-plugin';
import { Logger } from '@khulnasoft/logging';
import { SocketIOWebViewTransport } from '@khulnasoft/webview-transport-socket-io';
import { Transport } from '@khulnasoft/webview-transport';
import { WebviewUriProviderRegistry } from '../common/webview';
import { WebviewHtmlTransformer } from '../common/webview/html';
import { createFastifyHttpServer, createFastifySocketIoPlugin } from './http';
import { createWebviewPlugin, WebviewHttpAccessInfoProvider } from './webview';

export async function setupHttp(
  plugins: WebviewPlugin[],
  uriProviderRegistry: WebviewUriProviderRegistry,
  transportRegistry: Set<Transport>,
  webviewHtmlTransformer: WebviewHtmlTransformer,
  logger: Logger,
): Promise<void> {
  const server = await initializeHttpServer(
    plugins.map((x) => x.id),
    webviewHtmlTransformer,
    logger,
  );

  uriProviderRegistry.register(new WebviewHttpAccessInfoProvider(server.addresses()?.[0]));
  transportRegistry.add(new SocketIOWebViewTransport(server.io));
}

async function initializeHttpServer(
  webviewIds: WebviewId[],
  webviewHtmlTransformer: WebviewHtmlTransformer,
  logger: Logger,
) {
  const { shutdown: fastifyShutdown, server } = await createFastifyHttpServer({
    plugins: [
      createFastifySocketIoPlugin(),
      createWebviewPlugin({
        webviewIds,
        webviewHtmlTransformer,
      }),
      {
        plugin: async (app) => {
          app.get('/', () => {
            return { message: 'Hello, world!' };
          });
        },
      },
    ],
    logger,
  });

  const handleGracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down...`);
    server.io.close();
    await fastifyShutdown();
    logger.info('Shutdown complete. Exiting process.');
    process.exit(0);
  };

  process.on('SIGTERM', handleGracefulShutdown);
  process.on('SIGINT', handleGracefulShutdown);

  return server;
}

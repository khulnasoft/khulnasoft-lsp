import { Connection } from 'vscode-languageserver';
import { Logger } from '@khulnasoft/logging';
import { Endpoint, isNotificationEndpoint, isRequestEndpoint } from '@khulnasoft/endpoint';
import { Middleware } from './types';
import { applyMiddleware, createMiddlewareContext } from './utils';
import { ErrorHandlingMiddleware, LoggingMiddleware } from './middleware';

export class EndpointConnectionAdapter {
  #connection: Connection;

  #middleware: Middleware[] = [];

  #logger: Logger;

  constructor(connection: Connection, middleware: Middleware[], logger: Logger) {
    this.#connection = connection;
    this.#middleware = [
      new ErrorHandlingMiddleware(logger),
      ...middleware,
      new LoggingMiddleware(logger),
    ];
    this.#logger = logger;
  }

  applyEndpoints(endpoints: Endpoint[]): void {
    this.#logger.info(`Applying ${endpoints.length} endpoints to connection.`);

    endpoints.forEach((endpoint) => {
      const handler = applyMiddleware(
        (params: unknown) => Promise.resolve(endpoint.handle(params)),
        this.#middleware,
        createMiddlewareContext(endpoint),
      );

      if (isNotificationEndpoint(endpoint)) {
        this.#connection.onNotification(endpoint.methodName, handler);
        this.#logger.info(`Registered notification handler: ${endpoint.methodName}`);
      } else if (isRequestEndpoint(endpoint)) {
        this.#connection.onRequest(endpoint.methodName, handler);
        this.#logger.info(`Registered request handler: ${endpoint.methodName}`);
      }
    });
  }
}

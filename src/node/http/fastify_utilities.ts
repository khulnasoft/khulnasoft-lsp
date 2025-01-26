import { RouteHandlerMethod, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export const withTrailingSlashRedirect = (handler: RouteHandlerMethod): RouteHandlerMethod => {
  return function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    if (!request.url.endsWith('/')) {
      return reply.redirect(`${request.url}/`);
    }

    return handler.call(this, request, reply);
  };
};

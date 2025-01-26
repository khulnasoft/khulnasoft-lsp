import { FastifyInstance } from 'fastify';
import FastifyStatic, { FastifyStaticOptions } from '@fastify/static';

export const registerStaticPluginSafely = async (
  fastify: FastifyInstance,
  options: Omit<FastifyStaticOptions, 'decorateReply'>,
) => {
  // Check if 'sendFile' is already decorated on the reply object
  if (!fastify.hasReplyDecorator('sendFile')) {
    await fastify.register(FastifyStatic, {
      ...options,
      decorateReply: true,
    });
  } else {
    // Register the plugin without adding the decoration again
    await fastify.register(FastifyStatic, {
      ...options,
      decorateReply: false,
    });
  }
};

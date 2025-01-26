import { FastifyPluginOptions, FastifyPluginAsync } from 'fastify';

export type FastifyPluginRegistration<
  TPluginOptions extends FastifyPluginOptions = FastifyPluginOptions,
> = {
  plugin: FastifyPluginAsync<TPluginOptions>;
  options?: TPluginOptions;
};

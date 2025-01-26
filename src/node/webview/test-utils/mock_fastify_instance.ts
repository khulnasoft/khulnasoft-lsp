import { FastifyInstance } from 'fastify';

export type MockFastifyInstance = {
  [P in keyof FastifyInstance]: jest.Mock<FastifyInstance[P]>;
};

export const createMockFastifyInstance = (): MockFastifyInstance & FastifyInstance => {
  const reply: Partial<MockFastifyInstance> = {};

  reply.register = jest.fn().mockReturnThis();
  reply.get = jest.fn().mockReturnThis();

  return reply as MockFastifyInstance & FastifyInstance;
};

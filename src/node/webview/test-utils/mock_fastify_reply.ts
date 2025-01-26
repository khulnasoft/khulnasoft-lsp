import { FastifyReply } from 'fastify';

export type MockFastifyReply = {
  [P in keyof FastifyReply]: jest.Mock<FastifyReply[P]>;
};

export const createMockFastifyReply = (): MockFastifyReply & FastifyReply => {
  const reply: Partial<MockFastifyReply> = {};

  reply.send = jest.fn().mockReturnThis();
  reply.status = jest.fn().mockReturnThis();
  reply.redirect = jest.fn().mockReturnThis();
  reply.sendFile = jest.fn().mockReturnThis();
  reply.code = jest.fn().mockReturnThis();
  reply.header = jest.fn().mockReturnThis();
  reply.type = jest.fn().mockReturnThis();

  return reply as MockFastifyReply & FastifyReply;
};

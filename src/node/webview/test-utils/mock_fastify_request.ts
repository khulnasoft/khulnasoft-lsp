import { FastifyRequest } from 'fastify';

type CreateFastifyRequestParams = {
  url: string;
  params: Record<string, unknown>;
  log?: {
    error: jest.Mock;
  };
};

export function createMockFastifyRequest(
  params?: Partial<CreateFastifyRequestParams>,
): FastifyRequest {
  // eslint-disable-next-line no-param-reassign
  params ??= {};
  return {
    url: params.url ?? '',
    params: params.params ?? {},
    log: params.log || {
      error: jest.fn(),
    },
  } as unknown as FastifyRequest;
}

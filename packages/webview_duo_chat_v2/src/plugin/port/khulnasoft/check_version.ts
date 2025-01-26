import { ApiRequest } from '@khulnasoft/core';

export type KhulnaSoftVersionResponse = {
  version: string;
  enterprise?: boolean;
};
export const versionRequest: ApiRequest<KhulnaSoftVersionResponse> = {
  type: 'rest',
  method: 'GET',
  path: '/version',
};

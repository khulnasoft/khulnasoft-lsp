import { ApiRequest } from '../platform/web_ide';

export type KhulnaSoftVersionResponse = {
  version: string;
  enterprise?: boolean;
};
export const versionRequest: ApiRequest<KhulnaSoftVersionResponse> = {
  type: 'rest',
  method: 'GET',
  path: '/version',
};

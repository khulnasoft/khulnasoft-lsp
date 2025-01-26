import { Cable } from '@anycable/core';
import { Account } from '../platform/gitlab_account';
import { KhulnaSoftPlatformForAccount } from '../platform/gitlab_platform';
import { createFakePartial } from './create_fake_partial';
import { createFakeFetchFromApi } from './create_fake_fetch_from_api';

export const account: Account = {
  username: 'foobar',
  id: 'foobar',
  type: 'token',
  instanceUrl: 'gitlab-instance.xx',
  token: 'foobar-token',
};

export const createFakeCable = () =>
  createFakePartial<Cable>({
    subscribe: jest.fn(),
    disconnect: jest.fn(),
  });

export const gitlabPlatformForAccount: KhulnaSoftPlatformForAccount = {
  type: 'account',
  account,
  project: undefined,
  fetchFromApi: createFakeFetchFromApi(),
  connectToCable: async () => createFakeCable(),
  getUserAgentHeader: () => ({}),
};

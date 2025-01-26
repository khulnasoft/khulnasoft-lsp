/* eslint-disable max-classes-per-file */
import { Cable } from '@anycable/core';
import { Account } from './port/platform/gitlab_account';
import {
  KhulnaSoftPlatformBase,
  KhulnaSoftPlatformForAccount,
  KhulnaSoftPlatformForProject,
} from './port/platform/gitlab_platform';
import { ApiRequest } from './port/platform/web_ide';
import { KhulnaSoftApiClient } from './types';
import { KhulnaSoftProject } from './port/platform/gitlab_project';

export class ChatPlatform implements KhulnaSoftPlatformBase {
  #client: KhulnaSoftApiClient;

  constructor(client: KhulnaSoftApiClient) {
    this.#client = client;
  }

  account: Account = {
    id: 'https://gitlab.com|16918910',
    instanceUrl: 'https://gitlab.com',
  } as Partial<Account> as Account;

  fetchFromApi<TReturnType>(request: ApiRequest<TReturnType>): Promise<TReturnType> {
    return this.#client.fetchFromApi(request);
  }

  connectToCable(): Promise<Cable> {
    return this.#client.connectToCable();
  }

  getUserAgentHeader(): Record<string, string> {
    return {};
  }
}

export class ChatPlatformForAccount extends ChatPlatform implements KhulnaSoftPlatformForAccount {
  readonly type = 'account' as const;

  project: undefined;
}

export class ChatPlatformForProject extends ChatPlatform implements KhulnaSoftPlatformForProject {
  readonly type = 'project' as const;

  project: KhulnaSoftProject = {
    gqlId: 'gid://gitlab/Project/123456',
    restId: 0,
    name: '',
    description: '',
    namespaceWithPath: '',
    webUrl: '',
  };
}

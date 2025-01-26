import { ChatPlatformForAccount } from './chat_platform';
import {
  KhulnaSoftPlatformForAccount,
  KhulnaSoftPlatformForProject,
  KhulnaSoftPlatformManager,
} from './port/platform/gitlab_platform';
import { KhulnaSoftApiClient } from './types';

export class ChatPlatformManager implements KhulnaSoftPlatformManager {
  #client: KhulnaSoftApiClient;

  constructor(client: KhulnaSoftApiClient) {
    this.#client = client;
  }

  async getForActiveProject(): Promise<KhulnaSoftPlatformForProject | undefined> {
    // return new ChatPlatformForProject(this.#client);
    return undefined;
  }

  async getForActiveAccount(): Promise<KhulnaSoftPlatformForAccount | undefined> {
    return new ChatPlatformForAccount(this.#client);
  }

  async getForAllAccounts(): Promise<KhulnaSoftPlatformForAccount[]> {
    return [new ChatPlatformForAccount(this.#client)];
  }

  async getForSaaSAccount(): Promise<KhulnaSoftPlatformForAccount | undefined> {
    return new ChatPlatformForAccount(this.#client);
  }
}

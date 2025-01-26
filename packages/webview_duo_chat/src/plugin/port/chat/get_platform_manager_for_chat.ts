import { KhulnaSoftPlatformManager, KhulnaSoftPlatformForAccount } from '../platform/gitlab_platform';
import { getChatSupport } from './api/get_chat_support';

export const KHULNASOFT_COM_URL: string = 'https://gitlab.com';
export const KHULNASOFT_STAGING_URL: string = 'https://staging.gitlab.com';
export const KHULNASOFT_ORG_URL: string = 'https://dev.gitlab.org';
export const KHULNASOFT_DEVELOPMENT_URL: string = 'http://localhost';

export enum KhulnaSoftEnvironment {
  KHULNASOFT_COM = 'production',
  KHULNASOFT_STAGING = 'staging',
  KHULNASOFT_ORG = 'org',
  KHULNASOFT_DEVELOPMENT = 'development',
  KHULNASOFT_SELF_MANAGED = 'self-managed',
}

export class KhulnaSoftPlatformManagerForChat {
  readonly #platformManager: KhulnaSoftPlatformManager;

  constructor(platformManager: KhulnaSoftPlatformManager) {
    this.#platformManager = platformManager;
  }

  async getProjectGqlId(): Promise<string | undefined> {
    const projectManager = await this.#platformManager.getForActiveProject(false);
    return projectManager?.project.gqlId;
  }

  /**
   * Obtains a KhulnaSoft Platform to send API requests to the KhulnaSoft API
   * for the Duo Chat feature.
   *
   * - It returns a KhulnaSoftPlatformForAccount for the first linked account.
   * - It returns undefined if there are no accounts linked
   */
  async getKhulnaSoftPlatform(): Promise<KhulnaSoftPlatformForAccount | undefined> {
    const platforms = await this.#platformManager.getForAllAccounts();

    if (!platforms.length) {
      return undefined;
    }

    let platform: KhulnaSoftPlatformForAccount | undefined;

    // Using a for await loop in this context because we want to stop
    // evaluating accounts as soon as we find one with code suggestions enabled
    for await (const result of platforms.map(getChatSupport)) {
      if (result.hasSupportForChat) {
        platform = result.platform;
        break;
      }
    }

    return platform;
  }

  async getKhulnaSoftEnvironment(): Promise<KhulnaSoftEnvironment> {
    const platform = await this.getKhulnaSoftPlatform();
    const instanceUrl = platform?.account.instanceUrl;

    switch (instanceUrl) {
      case KHULNASOFT_COM_URL:
        return KhulnaSoftEnvironment.KHULNASOFT_COM;
      case KHULNASOFT_DEVELOPMENT_URL:
        return KhulnaSoftEnvironment.KHULNASOFT_DEVELOPMENT;
      case KHULNASOFT_STAGING_URL:
        return KhulnaSoftEnvironment.KHULNASOFT_STAGING;
      case KHULNASOFT_ORG_URL:
        return KhulnaSoftEnvironment.KHULNASOFT_ORG;
      default:
        return KhulnaSoftEnvironment.KHULNASOFT_SELF_MANAGED;
    }
  }
}

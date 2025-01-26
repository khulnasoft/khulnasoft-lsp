// import * as vscode from 'vscode';
import { Cable as ActionCableCable } from '@anycable/core';
import { fetchFromApi } from './web_ide';
import { KhulnaSoftProject } from './gitlab_project';
import { Account } from './gitlab_account';

/**
 * KhulnaSoftPlatform interface provides methods to fetch KhulnaSoft projects and make API requests.
 */
export interface KhulnaSoftPlatformBase {
  fetchFromApi: fetchFromApi;
  connectToCable: () => Promise<ActionCableCable>;
  account: Account;
  /**
   * What user agent should be used for API calls that are not made to KhulnaSoft API
   * (e.g. when calling Model Gateway for code suggestions)
   */
  getUserAgentHeader(): Record<string, string>;
}

export interface KhulnaSoftPlatformForAccount extends KhulnaSoftPlatformBase {
  type: 'account';
  project: undefined;
}

export interface KhulnaSoftPlatformForProject extends KhulnaSoftPlatformBase {
  type: 'project';
  project: KhulnaSoftProject;
}

export type KhulnaSoftPlatform = KhulnaSoftPlatformForProject | KhulnaSoftPlatformForAccount;

export interface KhulnaSoftPlatformManager {
  /**
   * Returns KhulnaSoftPlatform for the active project
   *
   * This is how we decide what is "active project":
   *   - if there is only one Git repository opened, we always return KhulnaSoft project associated with that repository
   *   - if there are multiple Git repositories opened, we return the one associated with the active editor
   *     - if there isn't active editor, we will return undefined if `userInitiated` is false, or we ask user to select one if user initiated is `true`
   *
   * @param userInitiated - Indicates whether the user initiated the action.
   * @returns A Promise that resolves with the fetched KhulnaSoftProject or undefined if an active project does not exist.
   */
  getForActiveProject(userInitiated: boolean): Promise<KhulnaSoftPlatformForProject | undefined>;

  /**
   * Returns a KhulnaSoftPlatform for the active account
   *
   * This is how we decide what is "active account":
   *  - If the user has signed in to a single KhulnaSoft account, it will return that account.
   *  - If the user has signed in to multiple KhulnaSoft accounts, a UI picker will request the user to choose the desired account.
   */
  getForActiveAccount(): Promise<KhulnaSoftPlatformForAccount | undefined>;

  /**
   * onAccountChange indicates that any of the KhulnaSoft accounts in the extension has changed.
   * This can mean account was removed, added or the account token has been changed.
   */
  // onAccountChange: vscode.Event<void>;

  getForAllAccounts(): Promise<KhulnaSoftPlatformForAccount[]>;

  /**
   * Returns KhulnaSoftPlatformForAccount if there is a SaaS account added. Otherwise returns undefined.
   */
  getForSaaSAccount(): Promise<KhulnaSoftPlatformForAccount | undefined>;
}

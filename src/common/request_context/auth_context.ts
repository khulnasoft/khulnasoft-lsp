import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { LogContext, logCtxItem } from '@khulnasoft/logging/src/log_context';
import { KhulnaSoftApiService, TokenInfo, UserService } from '@khulnasoft/core';

export interface AuthContext extends LogContext {
  user?: {
    name: string;
    username: string;
    id: number;
  };
  tokenInfo?: TokenInfo;
}

export const AuthContext = createInterfaceId<AuthContext>('AuthContext');

@Injectable(AuthContext, [UserService, KhulnaSoftApiService])
export class DefaultAuthContext implements AuthContext {
  #userService: UserService;

  #apiClient: KhulnaSoftApiService;

  constructor(userService: UserService, apiService: KhulnaSoftApiService) {
    this.#userService = userService;
    this.#apiClient = apiService;
  }

  get user() {
    const { user } = this.#userService;
    if (!user) return undefined;
    return {
      name: user.name,
      username: user.username,
      id: user.restId,
    };
  }

  get tokenInfo() {
    return this.#apiClient.tokenInfo;
  }

  readonly name = 'Authentication';

  get children() {
    const userInfo = this.user
      ? `${this.user.name} (@${this.user.username}, id: ${this.user.id})`
      : 'not authenticated';
    const tokenInfo = this.tokenInfo
      ? `type: ${this.tokenInfo.type}, scopes: ${this.tokenInfo.scopes.join(',')}`
      : 'invalid or not present';
    return [logCtxItem('User', userInfo), logCtxItem('Token', tokenInfo)];
  }
}

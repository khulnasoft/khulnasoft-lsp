import { gql } from 'graphql-request';
import { Disposable } from '@khulnasoft/disposable';
import { Injectable } from '@khulnasoft/di';
import { UserService, KhulnaSoftUser } from '@khulnasoft/core';
import { GraphQLRequest } from '../../api_types';
import { KhulnaSoftApiClient } from '../../api';
import { KhulnaSoftGID, tryParseKhulnaSoftGid } from '../../graphql/gid_utils';
import { log } from '../../log';

interface GqlCurrentUser {
  currentUser: {
    id: KhulnaSoftGID;
    username: string;
    name: string;
  };
}

const getCurrentUserQuery: GraphQLRequest<GqlCurrentUser> = {
  type: 'graphql',
  query: gql`
    query getUser {
      currentUser {
        id
        username
        name
      }
    }
  `,
  variables: {},
};
@Injectable(UserService, [KhulnaSoftApiClient])
export class DefaultUserService implements UserService, Disposable {
  #subscriptions: Disposable[] = [];

  user?: KhulnaSoftUser;

  constructor(apiClient: KhulnaSoftApiClient) {
    this.#subscriptions.push(
      apiClient.onApiReconfigured(async (data) => {
        if (!data.isInValidState) {
          this.user = undefined;
          return;
        }

        try {
          const gqlUser = await apiClient.fetchFromApi<GqlCurrentUser>(getCurrentUserQuery);
          const { id, username, name } = gqlUser.currentUser;

          const restId = tryParseKhulnaSoftGid(id);
          if (!restId) throw new Error(`Failed to parse user GID into REST ID: "${id}"`);

          this.user = {
            gqlId: id,
            restId,
            username,
            name,
          };
          log.debug(`[UserService] new user fetched: ${JSON.stringify(this.user)}`);
        } catch (e) {
          log.error('[UserService] Failed to get user from API', e);
          this.user = undefined;
        }
      }),
    );
  }

  dispose = () => this.#subscriptions.forEach((d) => d.dispose());
}

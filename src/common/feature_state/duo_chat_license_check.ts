import { gql } from 'graphql-request';
import { Disposable } from '@khulnasoft/disposable';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { KhulnaSoftApiClient } from '../api';
import { ClientConfig } from '../config_service';
import { ApiRequest } from '../api_types';
import { CHAT_NO_LICENSE, FeatureStateCheck, StateCheckId } from './feature_state_management_types';
import { StateCheck, StateCheckChangedEventData, StateConfigCheck } from './state_check';
import { ApiStateCheck } from './api_state_check';

export type DuoChatLicenseCheck = StateCheck<typeof CHAT_NO_LICENSE> & StateConfigCheck;

export const DuoChatLicenseCheck = createInterfaceId<DuoChatLicenseCheck>('DuoChatLicenseCheck');

export interface GqlDuoChatAvailable {
  currentUser: {
    duoChatAvailable: boolean;
  };
}

const query = {
  type: 'graphql',
  query: gql`
    query suggestionsAvailable {
      currentUser {
        duoChatAvailable
      }
    }
  `,
  variables: {},
  supportedSinceInstanceVersion: {
    version: '16.8.0',
    resourceName: 'get current user Duo Chat license',
  },
} satisfies ApiRequest<GqlDuoChatAvailable>;

@Injectable(DuoChatLicenseCheck, [KhulnaSoftApiClient])
export class DefaultDuoChatLicenseCheck implements DuoChatLicenseCheck {
  #apiStateCheck: ApiStateCheck<GqlDuoChatAvailable>;

  constructor(api: KhulnaSoftApiClient) {
    this.#apiStateCheck = new ApiStateCheck(
      api,
      this.id,
      this.details,
      query,
      (response) => response.currentUser.duoChatAvailable,
    );
  }

  onChanged(listener: (data: StateCheckChangedEventData) => void): Disposable {
    return this.#apiStateCheck.onChanged(listener);
  }

  get engaged() {
    return this.#apiStateCheck.engaged;
  }

  id = CHAT_NO_LICENSE;

  details =
    'Duo Chat is now a paid feature, part of Duo Pro. Contact your KhulnaSoft administrator to upgrade';

  dispose() {
    this.#apiStateCheck.dispose();
  }

  async validate(config: ClientConfig): Promise<FeatureStateCheck<StateCheckId> | undefined> {
    const isValid = await this.#apiStateCheck.validate(config);

    if (!isValid) {
      return {
        checkId: this.id,
        details: this.details,
        engaged: true,
      };
    }

    return undefined;
  }
}

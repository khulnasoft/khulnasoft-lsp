import { gql } from 'graphql-request';
import { Disposable } from '@khulnasoft/disposable';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ConfigService, ClientConfig } from '../config_service';
import { ApiRequest } from '../api_types';
import { KhulnaSoftApiClient } from '../api';
import {
  FeatureStateCheck,
  StateCheckId,
  SUGGESTIONS_NO_LICENSE,
} from './feature_state_management_types';
import { StateCheck, StateCheckChangedEventData, StateConfigCheck } from './state_check';
import { ApiStateCheck } from './api_state_check';

export type CodeSuggestionsDuoLicenseCheck = StateCheck<typeof SUGGESTIONS_NO_LICENSE> &
  StateConfigCheck;

export const CodeSuggestionsDuoLicenseCheck = createInterfaceId<CodeSuggestionsDuoLicenseCheck>(
  'CodeSuggestionsDuoLicenseCheck',
);

export interface GqlDuoCodeSuggestionsAvailable {
  currentUser: {
    duoCodeSuggestionsAvailable: boolean;
  };
}

const query = {
  type: 'graphql',
  query: gql`
    query suggestionsAvailable {
      currentUser {
        duoCodeSuggestionsAvailable
      }
    }
  `,
  variables: {},
} satisfies ApiRequest<GqlDuoCodeSuggestionsAvailable>;

@Injectable(CodeSuggestionsDuoLicenseCheck, [KhulnaSoftApiClient, ConfigService])
export class DefaultCodeSuggestionsDuoLicenseCheck implements CodeSuggestionsDuoLicenseCheck {
  #apiStateCheck: ApiStateCheck<GqlDuoCodeSuggestionsAvailable>;

  constructor(api: KhulnaSoftApiClient) {
    this.#apiStateCheck = new ApiStateCheck(
      api,
      this.id,
      this.details,
      query,
      (response) => response.currentUser.duoCodeSuggestionsAvailable,
    );
  }

  onChanged(listener: (data: StateCheckChangedEventData) => void): Disposable {
    return this.#apiStateCheck.onChanged(listener);
  }

  get engaged() {
    return this.#apiStateCheck.engaged;
  }

  id = SUGGESTIONS_NO_LICENSE;

  details =
    'Code Suggestions is now a paid feature, part of Duo Pro. Contact your KhulnaSoft administrator to upgrade';

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

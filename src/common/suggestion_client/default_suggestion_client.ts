import { KhulnaSoftApiClient } from '../api';
import { createV2Request } from './create_v2_request';
import { SuggestionClient, SuggestionContext, SuggestionResponse } from './suggestion_client';

export class DefaultSuggestionClient implements SuggestionClient {
  readonly #api: KhulnaSoftApiClient;

  constructor(api: KhulnaSoftApiClient) {
    this.#api = api;
  }

  async getSuggestions(
    suggestionContext: SuggestionContext,
  ): Promise<SuggestionResponse | undefined> {
    const response = await this.#api.getCodeSuggestions(createV2Request(suggestionContext));
    return response && { ...response, isDirectConnection: false };
  }
}

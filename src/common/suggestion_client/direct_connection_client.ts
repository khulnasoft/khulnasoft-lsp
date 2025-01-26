import fetch from 'cross-fetch';
import { IDirectConnectionDetails, KhulnaSoftApiClient, CodeSuggestionRequest } from '../api';
import { handleFetchError } from '../handle_fetch_error';
import { log } from '../log';
import { ConfigService } from '../config_service';
import { transformHeadersToSnowplowOptions } from '../utils/headers_to_snowplow_options';
import { ExponentialBackoffCircuitBreaker } from '../circuit_breaker/exponential_backoff_circuit_breaker';
import { isFetchError } from '../fetch_error';
import { getUserAgent } from '../utils/get_user_agent';
import { getLanguageServerVersion } from '../utils/get_language_server_version';
import {
  GENERATION,
  SuggestionClient,
  SuggestionContext,
  SuggestionResponse,
} from './suggestion_client';
import { createV2Request } from './create_v2_request';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const SMALL_GRACE_DURATION_JUST_TO_BE_SURE = 40 * SECOND;

const areExpired = (dcd: IDirectConnectionDetails) =>
  Date.now() > dcd.expires_at * SECOND - SMALL_GRACE_DURATION_JUST_TO_BE_SURE;

export class DirectConnectionClient implements SuggestionClient {
  #api: KhulnaSoftApiClient;

  #connectionDetails: IDirectConnectionDetails | undefined;

  #configService: ConfigService;

  #isValidApi = true;

  #connectionDetailsCircuitBreaker = new ExponentialBackoffCircuitBreaker({
    maxBackoffMs: HOUR,
    initialBackoffMs: SECOND,
    backoffMultiplier: 3,
  });

  #directConnectionCircuitBreaker = new ExponentialBackoffCircuitBreaker({
    initialBackoffMs: SECOND,
    maxBackoffMs: 10 * MINUTE,
    backoffMultiplier: 5,
  });

  constructor(api: KhulnaSoftApiClient, configService: ConfigService) {
    this.#api = api;
    this.#configService = configService;
    this.#connectionDetailsCircuitBreaker.onOpen(() =>
      log.warn(
        'Warning: Too many failures when requesting details for sending Code Suggestions to KhulnaSoft Cloud Connector. Please retry later.',
      ),
    );
    this.#directConnectionCircuitBreaker.onOpen(() =>
      log.warn(
        'Sending code suggestions requests directly to KhulnaSoft cloud failed too many times, we will wait a while before trying again. In the meantime, suggestions requests will be sent to your KhulnaSoft instance.',
      ),
    );
    this.#api.onApiReconfigured(({ isInValidState }) => {
      this.#connectionDetails = undefined;
      this.#isValidApi = isInValidState;
      this.#directConnectionCircuitBreaker.success(); // resets the circuit breaker
      // TODO: fetch the direct connection details https://github.com/khulnasoft/khulnasoft-lsp/-/issues/239
    });
  }

  #fetchDirectConnectionDetails = async () => {
    if (this.#connectionDetailsCircuitBreaker.isOpen()) {
      return;
    }

    let details;
    try {
      details = await this.#api.fetchFromApi<IDirectConnectionDetails>({
        type: 'rest',
        method: 'POST',
        path: '/code_suggestions/direct_access',
        supportedSinceInstanceVersion: {
          version: '17.2.0',
          resourceName: 'get direct connection details',
        },
      });
    } catch (e) {
      // 401 indicates that the user has KhulnaSoft Duo disabled and shout result in longer periods of open circuit
      if (isFetchError(e) && e.status === 401) {
        this.#connectionDetailsCircuitBreaker.megaError();
      } else {
        this.#connectionDetailsCircuitBreaker.error();
      }
      log.info(
        `Failed to fetch direct connection details from KhulnaSoft instance. Code suggestion requests will be sent to your KhulnaSoft instance. This error is not critical and can be ignored. Error ${e}`,
      );
    }
    this.#connectionDetails = details;
    this.#configService.merge({
      client: { snowplowTrackerOptions: transformHeadersToSnowplowOptions(details?.headers) },
    });
  };

  async #fetchUsingDirectConnection<T>(request: CodeSuggestionRequest): Promise<T> {
    if (!this.#connectionDetails) {
      throw new Error('Assertion error: connection details are undefined');
    }
    const suggestionEndpoint = `${this.#connectionDetails.base_url}/v2/completions`;
    const start = Date.now();
    const response = await fetch(suggestionEndpoint, {
      method: 'post',
      body: JSON.stringify(request),
      keepalive: true,
      headers: {
        ...this.#connectionDetails.headers,
        'User-Agent': getUserAgent(this.#configService.get('client.clientInfo')),
        Authorization: `Bearer ${this.#connectionDetails.token}`,
        'X-Gitlab-Authentication-Type': 'oidc',
        'X-Gitlab-Language-Server-Version': getLanguageServerVersion(),
        'Content-Type': ' application/json',
      },
      signal: AbortSignal.timeout(5 * SECOND),
    });
    await handleFetchError(response, 'Direct Connection for code suggestions');
    const data = await response.json();
    const end = Date.now();
    log.debug(`Direct connection (${suggestionEndpoint}) suggestion fetched in ${end - start}ms`);
    return data;
  }

  async getSuggestions(context: SuggestionContext): Promise<SuggestionResponse | undefined> {
    if (context.intent === GENERATION) {
      return undefined;
    }
    if (!this.#isValidApi) {
      return undefined;
    }
    if (this.#directConnectionCircuitBreaker.isOpen()) {
      return undefined;
    }
    if (!this.#connectionDetails || areExpired(this.#connectionDetails)) {
      this.#fetchDirectConnectionDetails().catch(
        (e) => log.error(`#fetchDirectConnectionDetails error: ${e}`), // this makes eslint happy, the method should never throw
      );
      return undefined;
    }
    try {
      const response = await this.#fetchUsingDirectConnection<SuggestionResponse>(
        createV2Request(context, this.#connectionDetails.model_details),
      );
      return response && { ...response, isDirectConnection: true };
    } catch (e) {
      this.#directConnectionCircuitBreaker.error();
      log.warn(
        'Direct connection for code suggestions failed. Code suggestion requests will be sent to your KhulnaSoft instance.',
        e,
      );
    }

    return undefined;
  }
}

import type { ReadableStream } from 'node:stream/web';
import https from 'https';
import http from 'http';
import fs from 'fs';
import fetch from 'cross-fetch';
import { getProxySettings } from 'get-proxy-settings';
import { ProxyAgent } from 'proxy-agent';
import { isEqual } from 'lodash';
import { Injectable } from '@khulnasoft/di';
import { CancellationToken } from 'vscode-languageserver-protocol';
import { LsFetch, FetchBase, FetchAgentOptions } from '../common/fetch';
import { log } from '../common/log';
import { REQUEST_TIMEOUT_MILLISECONDS } from '../common/constants';
import { isAbortError, TimeoutError } from '../common/fetch_error';

const httpAgent = new http.Agent({
  keepAlive: true,
});

export interface LsRequestInit extends RequestInit {
  agent: ProxyAgent | https.Agent | http.Agent;
}

interface LsAgentOptions {
  rejectUnauthorized: boolean;
  ca?: Buffer;
  cert?: Buffer;
  key?: Buffer;
}

/**
 * Wrap fetch to support proxy configurations
 */
@Injectable(LsFetch, [])
export class Fetch extends FetchBase implements LsFetch {
  #proxy?: ProxyAgent;

  #userProxy?: string;

  #initialized: boolean = false;

  #httpsAgent: https.Agent;

  #agentOptions: Readonly<LsAgentOptions>;

  constructor(userProxy?: string) {
    super();

    this.#agentOptions = {
      rejectUnauthorized: true,
    };
    this.#userProxy = userProxy;
    this.#httpsAgent = this.#createHttpsAgent();
  }

  async initialize(): Promise<void> {
    // Set http_proxy and https_proxy environment variables
    // which will then get picked up by the ProxyAgent and
    // used.
    try {
      const proxy = await getProxySettings();
      if (proxy?.http) {
        process.env.http_proxy = `${proxy.http.protocol}://${proxy.http.host}:${proxy.http.port}`;
        log.info(`fetch: Detected http proxy through settings: ${process.env.http_proxy}`);
        if (
          proxy.http?.credentials &&
          proxy.http.credentials?.username &&
          proxy.http.credentials?.password
        ) {
          log.info(
            `fetch: Added credentials to http_proxy for username: ${proxy.http.credentials.username}`,
          );
          // NOTE: Do not log this variable after sensitive values have been included.
          process.env.http_proxy = `${proxy.http.protocol}://${proxy.http.credentials.username}:${proxy.http.credentials.password}@${proxy.http.host}:${proxy.http.port}`;
        }
      }

      if (proxy?.https) {
        process.env.https_proxy = `${proxy.https.protocol}://${proxy.https.host}:${proxy.https.port}`;
        log.info(`fetch: Detected https proxy through settings: ${process.env.https_proxy}`);
        if (
          proxy.https?.credentials &&
          proxy.https.credentials?.username &&
          proxy.https.credentials?.password
        ) {
          log.info(
            `fetch: Added credentials to HTTPS_PROXY for username: ${proxy.https.credentials.username}`,
          );
          // NOTE: Do not log this variable after sensitive values have been included.
          process.env.https_proxy = `${proxy.https.protocol}://${proxy.https.credentials.username}:${proxy.https.credentials.password}@${proxy.https.host}:${proxy.https.port}`;
        }
      }

      if (!proxy?.http && !proxy?.https) {
        log.info(`fetch: Detected no proxy settings`);
      }
    } catch (err) {
      log.warn('Unable to load proxy settings', err);
    }

    if (this.#userProxy) {
      log.debug(`fetch: Detected user proxy ${this.#userProxy}`);
      process.env.http_proxy = this.#userProxy;
      process.env.https_proxy = this.#userProxy;
    }

    if (process.env.http_proxy || process.env.https_proxy) {
      this.#proxy = this.#createProxyAgent();
    }

    this.#initialized = true;
  }

  async destroy(): Promise<void> {
    this.#proxy?.destroy();
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (!this.#initialized) {
      throw new Error('LsFetch not initialized. Make sure LsFetch.initialize() was called.');
    }

    // In order to support both an AbortSignal from outside consumer code (passed via `init`) and the request timeout
    // abort controller below, we create a wrapping controller which aborts if either signal is aborted.
    const controller = new AbortController();
    const timeoutAbortSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS);

    // Listen to both signals. Once we support Node.js >= v20 we can switch to `AbortController.any()`
    [init?.signal, timeoutAbortSignal].forEach((signal) => {
      signal?.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    });

    try {
      return await this.#fetchLogged(input, {
        ...init,
        signal: controller.signal,
        agent: this.#getAgent(input),
      });
    } catch (e) {
      if (isAbortError(e)) {
        const { reason } = controller.signal;
        if (reason instanceof Error && reason.name === 'TimeoutError') {
          // Only convert to TimeoutError if this was the timeout signal we set up above
          // Otherwise it's an abort signal passed in from other consumer code
          throw new TimeoutError(input);
        }
      }
      throw e;
    }
  }

  updateAgentOptions({ ignoreCertificateErrors, ca, cert, certKey }: FetchAgentOptions): void {
    let fileOptions = {};
    try {
      fileOptions = {
        ...(ca ? { ca: fs.readFileSync(ca) } : {}),
        ...(cert ? { cert: fs.readFileSync(cert) } : {}),
        ...(certKey ? { key: fs.readFileSync(certKey) } : {}),
      };
    } catch (err) {
      log.error('Error reading https agent options from file', err);
    }

    const newOptions: LsAgentOptions = {
      rejectUnauthorized: !ignoreCertificateErrors,
      ...fileOptions,
    };

    if (isEqual(newOptions, this.#agentOptions)) {
      // new and old options are the same, nothing to do
      return;
    }

    this.#agentOptions = newOptions;
    this.#httpsAgent = this.#createHttpsAgent();
    if (this.#proxy) {
      this.#proxy = this.#createProxyAgent();
    }
  }

  /**
   * Note: we yield chunks of the stream as strings,
   * as the caller is responsible for aggregating them
   */
  async *streamResponse(
    response: Response,
    cancellationToken: CancellationToken,
  ): AsyncGenerator<string, void, void> {
    if (!response.body) {
      return;
    }

    const decoder = new TextDecoder();

    async function* readStream(
      stream: ReadableStream<Uint8Array>,
    ): AsyncGenerator<string, void, void> {
      for await (const chunk of stream) {
        if (cancellationToken.isCancellationRequested) {
          if ('destroy' in stream) {
            log.debug('Cancelling stream');
            (stream as { destroy: () => void }).destroy();
          }
          return;
        }

        yield decoder.decode(chunk);
      }
    }

    // Note: Using (node:stream).ReadableStream as it supports async iterators
    yield* readStream(response.body as ReadableStream);
  }

  #createHttpsAgent(): https.Agent {
    const agentOptions = {
      ...this.#agentOptions,
      keepAlive: true,
    };
    log.debug(
      `fetch: https agent with options initialized ${JSON.stringify(
        this.#sanitizeAgentOptions(agentOptions),
      )}.`,
    );
    return new https.Agent(agentOptions);
  }

  #createProxyAgent(): ProxyAgent {
    log.debug(
      `fetch: proxy agent with options initialized ${JSON.stringify(
        this.#sanitizeAgentOptions(this.#agentOptions),
      )}.`,
    );
    return new ProxyAgent(this.#agentOptions);
  }

  async #fetchLogged(input: RequestInfo | URL, init: LsRequestInit): Promise<Response> {
    const start = Date.now();
    const url = this.#extractURL(input);

    if (init.agent === httpAgent) {
      log.debug(`fetch: request for ${url} made with http agent.`);
    } else {
      const type = init.agent === this.#proxy ? 'proxy' : 'https';
      log.debug(`fetch: request for ${url} made with ${type} agent.`);
    }

    try {
      const resp = await fetch(input, init);
      const duration = Date.now() - start;

      log.debug(`fetch: request to ${url} returned HTTP ${resp.status} after ${duration} ms`);

      return resp;
    } catch (e) {
      const duration = Date.now() - start;
      log.debug(`fetch: request to ${url} threw an exception after ${duration} ms`);
      log.error(`fetch: request to ${url} failed with:`, e);
      throw e;
    }
  }

  #getAgent(input: RequestInfo | URL): ProxyAgent | https.Agent | http.Agent {
    if (this.#proxy) {
      return this.#proxy;
    }
    if (input.toString().startsWith('https://')) {
      return this.#httpsAgent;
    }

    return httpAgent;
  }

  #extractURL(input: RequestInfo | URL): string {
    if (input instanceof URL) {
      return input.toString();
    }

    if (typeof input === 'string') {
      return input;
    }

    return input.url;
  }

  #sanitizeAgentOptions(agentOptions: LsAgentOptions) {
    const { ca, cert, key, ...options } = agentOptions;
    return {
      ...options,
      ...(ca ? { ca: '<hidden>' } : {}),
      ...(cert ? { cert: '<hidden>' } : {}),
      ...(key ? { key: '<hidden>' } : {}),
    };
  }
}

/* eslint-disable max-classes-per-file */
import { REQUEST_TIMEOUT_MILLISECONDS } from './constants';
import { extractURL } from './utils/extract_url';

export interface DetailedError extends Error {
  readonly details: Record<string, unknown>;
}

export function isDetailedError(object: unknown): object is DetailedError {
  return Boolean((object as DetailedError).details);
}
export function isFetchError(object: unknown): object is FetchError {
  return object instanceof FetchError;
}
export function isAbortError(object: unknown): object is Error & { name: 'AbortError' } {
  return object instanceof Error && object.name === 'AbortError';
}
export const stackToArray = (stack: string | undefined): string[] => (stack ?? '').split('\n');

export interface ResponseError extends Error {
  status: number;
  body?: unknown;
}
const getErrorType = (body: string): string | unknown => {
  try {
    const parsedBody = JSON.parse(body);
    return parsedBody?.error;
  } catch {
    return undefined;
  }
};

const isInvalidTokenError = (response: Response, body?: string) =>
  Boolean(response.status === 401 && body && getErrorType(body) === 'invalid_token');

const isInvalidRefresh = (response: Response, body?: string) =>
  Boolean(response.status === 400 && body && getErrorType(body) === 'invalid_grant');

export class FetchError extends Error implements ResponseError, DetailedError {
  response: Response;

  #body?: string;

  constructor(response: Response, resourceName: string, body?: string) {
    let message = `Fetching ${resourceName} from ${response.url} failed`;
    if (isInvalidTokenError(response, body)) {
      message = `Request for ${resourceName} failed because the token is expired or revoked.`;
    }
    if (isInvalidRefresh(response, body)) {
      message = `Request to refresh token failed, because it's revoked or already refreshed.`;
    }
    super(message);
    this.response = response;
    this.#body = body;
  }

  get status() {
    return this.response.status;
  }

  isInvalidToken(): boolean {
    return (
      isInvalidTokenError(this.response, this.#body) || isInvalidRefresh(this.response, this.#body)
    );
  }

  get details() {
    const { message, stack } = this;
    return {
      message,
      stack: stackToArray(stack),
      response: {
        status: this.response.status,
        headers: this.response.headers,
        body: this.#body,
      },
    };
  }
}

export class TimeoutError extends Error {
  constructor(url: URL | RequestInfo) {
    const timeoutInSeconds = Math.round(REQUEST_TIMEOUT_MILLISECONDS / 1000);
    super(
      `Request to ${extractURL(url)} timed out after ${timeoutInSeconds} second${timeoutInSeconds === 1 ? '' : 's'}`,
    );
  }
}

export class InvalidInstanceVersionError extends Error {}

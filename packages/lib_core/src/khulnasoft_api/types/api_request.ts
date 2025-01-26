// why: `_TReturnType` helps encapsulate the full request type when used with `fetchFromApi`
/* eslint @typescript-eslint/no-unused-vars: ["error", { "varsIgnorePattern": "TReturnType" }] */

import { SupportedSinceInstanceVersion } from './supported_since_instance_version';

interface BaseRequest {
  signal?: AbortSignal;
}

interface BaseRestRequest<_TReturnType> extends BaseRequest {
  type: 'rest';
  /**
   * The request path without `/api/v4`
   * If you want to make request to `https://gitlab.example/api/v4/projects`
   * set the path to `/projects`
   */
  path: string;
  headers?: Record<string, string>;
  supportedSinceInstanceVersion?: SupportedSinceInstanceVersion;
}

export interface GraphQLRequest<_TReturnType> extends BaseRequest {
  type: 'graphql';
  query: string;
  /** Options passed to the GraphQL query */
  variables: Record<string, unknown>;
  supportedSinceInstanceVersion?: SupportedSinceInstanceVersion;
}

export interface PostRequest<_TReturnType> extends BaseRestRequest<_TReturnType> {
  method: 'POST';
  body?: unknown;
}

export interface PatchRequest<_TReturnType> extends BaseRestRequest<_TReturnType> {
  method: 'PATCH';
  body?: unknown;
}

/**
 * The response body is parsed as JSON and it's up to the client to ensure it
 * matches the TReturnType
 */
export interface GetRequest<_TReturnType> extends BaseRestRequest<_TReturnType> {
  method: 'GET';
  searchParams?: Record<string, string>;
  supportedSinceInstanceVersion?: SupportedSinceInstanceVersion;
}

export type ApiRequest<_TReturnType> =
  | GetRequest<_TReturnType>
  | PostRequest<_TReturnType>
  | PatchRequest<_TReturnType>
  | GraphQLRequest<_TReturnType>;

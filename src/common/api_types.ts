// why: `_TReturnType` helps encapsulate the full request type when used with `fetchFromApi`
/* eslint @typescript-eslint/no-unused-vars: ["error", { "varsIgnorePattern": "TReturnType" }] */

/**
 * The response body is parsed as JSON and it's up to the client to ensure it
 * matches the TReturnType
 */
interface SupportedSinceInstanceVersion {
  version: string;
  resourceName: string;
}

interface BaseRequest {
  baseUrl?: string;
  token?: string;
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
  /**
   * Options passed to the GraphQL query.
   * GraphQL IDs can be created from REST IDs using the `toKhulnaSoftGid` utility function.
   */
  variables: Record<string, unknown>;
  supportedSinceInstanceVersion?: SupportedSinceInstanceVersion;
}

export interface PostRequest<_TReturnType> extends BaseRestRequest<_TReturnType> {
  method: 'POST';

  body?: unknown;
}

interface PatchRequest<_TReturnType> extends BaseRestRequest<_TReturnType> {
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

export type ResolutionStrategy = 'open_tabs' | 'imports';

export type AdditionalContext = {
  /**
   * The type of the context element. Options: `file` or `snippet`.
   */
  type: 'file' | 'snippet';
  /**
   * The name of the context element. A name of the file or a code snippet.
   */
  name: string;
  /**
   * The content of the context element. The body of the file or a function.
   */
  content: string;
  /**
   * Where the context was derived from
   */
  resolution_strategy: ResolutionStrategy;
};

interface ISuggestionOptionModel {
  lang?: string;
  engine?: string;
  name?: string;
}

// FIXME: Rename to SuggestionOptionText and then rename SuggestionOptionOrStream to SuggestionOption
// this refactor can't be done now (2024-05-28) because all the conflicts it would cause with WIP
export interface SuggestionOption {
  index?: number;
  text: string;
  uniqueTrackingId: string;
  model?: ISuggestionOptionModel;
}

export interface TelemetryRequest {
  event: string;
  additional_properties: {
    unique_tracking_id: string;
    language?: string;
    suggestion_size?: number;
    timestamp: string;
  };
}

export type KhulnaSoftProjectId = number;

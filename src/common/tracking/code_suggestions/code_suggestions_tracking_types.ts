import { InitializeParams, InlineCompletionTriggerKind } from 'vscode-languageserver';
import { IDocContext } from '../../document_transformer_service';
import { AdditionalContext, SuggestionOption } from '../../api_types';
import { CODE_SUGGESTIONS_TRACKING_EVENTS } from './constants';

export interface ICodeSuggestionContextUpdate {
  documentContext: IDocContext;
  source: SuggestionSource;
  isStreaming: boolean;
  model: ICodeSuggestionModel;
  status: number;
  debounceInterval: number;
  gitlab_global_user_id: string;
  gitlab_instance_id: string;
  gitlab_host_name: string;
  gitlab_saas_duo_pro_namespace_ids: number[];
  isInvoked: boolean;
  optionsCount: number;
  acceptedOption: number;
  triggerKind: InlineCompletionTriggerKind;
  additionalContexts: AdditionalContext[];
  isDirectConnection: boolean;
  suggestionOptions: SuggestionOption[];
}

export type ClientInfo = InitializeParams['clientInfo'];

export enum GitlabRealm {
  saas = 'saas',
  selfManaged = 'self-managed',
}

export enum SuggestionSource {
  cache = 'cache',
  network = 'network',
}

export interface IdeInfo {
  name: string;
  version: string;
  vendor: string;
}

export interface ITelemetryOptions {
  enabled?: boolean;
  baseUrl?: string;
  trackingUrl?: string;
  actions?: Array<{ action: CODE_SUGGESTIONS_TRACKING_EVENTS }>;
  // FIXME: we use the IDE info and Client info in the request context now, we should refactor this to be more generic and not strictly telemetry related
  // i.e. these properties should be moved out of telemetry and into the client config
  ide?: IdeInfo;
  extension?: ClientInfo;
}

export interface ICodeSuggestionModel {
  lang?: string;
  engine?: string;
  name?: string;
  tokens_consumption_metadata?: {
    input_tokens?: number;
    output_tokens?: number;
    context_tokens_sent?: number;
    context_tokens_used?: number;
  };
}

export type CodeSuggestionsTelemetryEvent = CODE_SUGGESTIONS_TRACKING_EVENTS;

type UniqueTrackingId = string;

export type CodeSuggestionsTelemetryEventContext = UniqueTrackingId;

export interface CodeSuggestionsTelemetryTrackingContext {
  uniqueTrackingId: UniqueTrackingId;
  context: Partial<ICodeSuggestionContextUpdate>;
}

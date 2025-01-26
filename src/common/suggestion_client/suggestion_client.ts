import { AdditionalContext } from '../api_types';
import { IDocContext } from '../document_transformer_service';

export interface SuggestionModel {
  lang?: string;
  engine?: string;
  name?: string;
}

/** We request 4 options. That's maximum supported number of Google Vertex */
export const MANUAL_REQUEST_OPTIONS_COUNT = 4;
export type OptionsCount = 1 | typeof MANUAL_REQUEST_OPTIONS_COUNT;

export const GENERATION = 'generation';
export const COMPLETION = 'completion';

export type Intent = typeof GENERATION | typeof COMPLETION | undefined;

export interface SuggestionContext {
  document: IDocContext;
  intent?: Intent;
  projectPath?: string;
  optionsCount?: OptionsCount;
  additionalContexts?: AdditionalContext[];
}

export interface SuggestionResponse {
  choices?: SuggestionResponseChoice[];
  model?: SuggestionModel;
  status: number;
  error?: string;
  isDirectConnection?: boolean;
}

export interface SuggestionResponseChoice {
  text: string;
}

export interface SuggestionClient {
  getSuggestions(context: SuggestionContext): Promise<SuggestionResponse | undefined>;
}

export type SuggestionClientFn = SuggestionClient['getSuggestions'];

export type SuggestionClientMiddleware = (
  context: SuggestionContext,
  next: SuggestionClientFn,
) => ReturnType<SuggestionClientFn>;

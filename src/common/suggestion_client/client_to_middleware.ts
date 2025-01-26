import { SuggestionClient, SuggestionClientMiddleware } from './suggestion_client';

export const clientToMiddleware =
  (client: SuggestionClient): SuggestionClientMiddleware =>
  (context) =>
    client.getSuggestions(context);

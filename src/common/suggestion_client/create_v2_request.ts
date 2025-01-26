import { CodeSuggestionRequest, IDirectConnectionModelDetails } from '../api';
import { SuggestionContext } from './suggestion_client';

export const createV2Request = (
  suggestionContext: SuggestionContext,
  modelDetails?: IDirectConnectionModelDetails,
): CodeSuggestionRequest => ({
  prompt_version: 1,
  project_path: suggestionContext.projectPath ?? '',
  project_id: -1,
  current_file: {
    content_above_cursor: suggestionContext.document.prefix,
    content_below_cursor: suggestionContext.document.suffix,
    file_name: suggestionContext.document.fileRelativePath,
  },
  choices_count: suggestionContext.optionsCount,
  ...(suggestionContext.intent && { intent: suggestionContext.intent }),
  ...(suggestionContext?.additionalContexts?.length && {
    context: suggestionContext.additionalContexts,
  }),
  ...(modelDetails || {}),
});

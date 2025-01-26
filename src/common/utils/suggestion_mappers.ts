import {
  CompletionItem,
  CompletionItemKind,
  InlineCompletionList,
  InlineCompletionParams,
  Range,
} from 'vscode-languageserver';
import { SuggestionOption } from '../api_types';
import { StartStreamOption, SuggestionOptionOrStream } from '../api';
import { START_STREAMING_COMMAND, SUGGESTION_ACCEPTED_COMMAND } from '../constants';
import { sanitizeRange } from './sanitize_range';

export const isStream = (o: SuggestionOptionOrStream): o is StartStreamOption =>
  Boolean((o as StartStreamOption).streamId);
export const isTextSuggestion = (o: SuggestionOptionOrStream): o is SuggestionOption =>
  Boolean((o as SuggestionOption).text);

export const completionOptionMapper = (options: SuggestionOption[]): CompletionItem[] =>
  options.map((option, index) => ({
    label: `KhulnaSoft Suggestion ${index + 1}: ${option.text}`,
    kind: CompletionItemKind.Text,
    insertText: option.text,
    detail: option.text,
    command: {
      title: 'Accept suggestion',
      command: SUGGESTION_ACCEPTED_COMMAND,
      arguments: [option.uniqueTrackingId],
    },
    data: {
      index,
      trackingId: option.uniqueTrackingId,
    },
  }));

/* this value will be used for telemetry so to make it human-readable
we use the 1-based indexing instead of 0 */
const getOptionTrackingIndex = (option: SuggestionOption) => {
  return typeof option.index === 'number' ? option.index + 1 : undefined;
};

export const inlineCompletionOptionMapper = (
  params: InlineCompletionParams,
  options: SuggestionOptionOrStream[],
): InlineCompletionList => ({
  items: options.map((option) => {
    if (isStream(option)) {
      // the streaming item is empty and only indicates to the client that streaming started
      return {
        insertText: '',
        command: {
          title: 'Start streaming',
          command: START_STREAMING_COMMAND,
          arguments: [option.streamId, option.uniqueTrackingId],
        },
      };
    }
    const completionInfo = params.context.selectedCompletionInfo;
    let rangeDiff = 0;

    if (completionInfo) {
      const range = sanitizeRange(completionInfo.range);
      rangeDiff = range.end.character - range.start.character;
    }
    return {
      insertText: completionInfo
        ? `${completionInfo.text.substring(rangeDiff)}${option.text}`
        : option.text,
      range: Range.create(params.position, params.position),
      command: {
        title: 'Accept suggestion',
        command: SUGGESTION_ACCEPTED_COMMAND,
        arguments: [option.uniqueTrackingId, getOptionTrackingIndex(option)],
      },
    };
  }),
});

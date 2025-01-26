import { log } from '../../log';
import {
  endStates,
  nonStreamingSuggestionStateGraph,
  streamingSuggestionStateGraph,
  CODE_SUGGESTIONS_TRACKING_EVENTS,
} from './constants';

export class CodeSuggestionTelemetryState {
  #codeSuggestionStates = new Map<string, CODE_SUGGESTIONS_TRACKING_EVENTS>();

  #trackerName: string = '';

  constructor(trackerName: string) {
    this.#trackerName = trackerName;
  }

  canUpdateState(
    uniqueTrackingId: string,
    newState: CODE_SUGGESTIONS_TRACKING_EVENTS,
    isStreaming: boolean = false,
  ): boolean {
    if (newState === CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED) {
      return true;
    }
    const currentState = this.#codeSuggestionStates.get(uniqueTrackingId);

    if (!currentState) {
      log.debug(`${this.#trackerName}: The suggestion with ${uniqueTrackingId} can't be found`);
      return false;
    }

    const allowedTransitions = isStreaming
      ? streamingSuggestionStateGraph.get(currentState as CODE_SUGGESTIONS_TRACKING_EVENTS)
      : nonStreamingSuggestionStateGraph.get(currentState as CODE_SUGGESTIONS_TRACKING_EVENTS);

    if (!allowedTransitions) {
      log.debug(
        `${this.#trackerName}: The suggestion's ${uniqueTrackingId} state ${currentState} can't be found in state graph`,
      );
      return false;
    }

    if (
      !allowedTransitions.includes(newState) &&
      newState !== CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED
    ) {
      log.debug(
        `${this.#trackerName}: Unexpected transition from ${currentState} into ${newState} for ${uniqueTrackingId}`,
      );
      return false;
    }

    return true;
  }

  updateSuggestionState(
    uniqueTrackingId: string,
    newState: CODE_SUGGESTIONS_TRACKING_EVENTS,
    isStreaming: boolean = false,
  ) {
    if (!this.canUpdateState(uniqueTrackingId, newState, isStreaming)) {
      log.info(`${this.#trackerName}: ${uniqueTrackingId} state can't be updated.`);
      return;
    }
    const currentState = this.#codeSuggestionStates.get(uniqueTrackingId);
    this.#codeSuggestionStates.set(uniqueTrackingId, newState);

    if (newState === CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED) {
      log.debug(`${this.#trackerName}: New suggestion ${uniqueTrackingId} has been requested`);
    } else {
      log.debug(
        `${this.#trackerName}: ${uniqueTrackingId} transitioned from ${currentState} to ${newState}`,
      );
    }
  }

  getOpenedSuggestions(): string[] {
    const openedSuggestionsTrackingIds: string[] = [];
    this.#codeSuggestionStates.forEach((state, uniqueTrackingId) => {
      if (!endStates.includes(state)) {
        openedSuggestionsTrackingIds.push(uniqueTrackingId);
      }
    });
    return openedSuggestionsTrackingIds;
  }

  deleteSuggestion(uniqueTrackingId: string) {
    this.#codeSuggestionStates.delete(uniqueTrackingId);
  }
}

// Import necessary modules and create mocks
import { log } from '../../log';
import { CODE_SUGGESTIONS_TRACKING_EVENTS } from './constants';
import { CodeSuggestionTelemetryState } from './code_suggestions_telemetry_state_manager';

jest.mock('../../log');

describe('CodeSuggestionTelemetryState', () => {
  let telemetryState: CodeSuggestionTelemetryState;
  const trackerName = 'TestTracker';
  const uniqueTrackingId = 'id1';

  beforeEach(() => {
    telemetryState = new CodeSuggestionTelemetryState(trackerName);
  });

  describe('canUpdateState', () => {
    describe('Streaming', () => {
      it('should return true if newState is REQUESTED', () => {
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
          true,
        );
        expect(result).toBe(true);
      });

      it("should return false when can't find suggestion in the state graph", () => {
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED,
          true,
        );
        expect(log.debug).toHaveBeenCalledWith(
          `${trackerName}: The suggestion with ${uniqueTrackingId} can't be found`,
        );
        expect(result).toBe(false);
      });

      it('should return false if transition is not allowed', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
        );
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_COMPLETED,
          true,
        );
        expect(log.debug).toHaveBeenCalledWith(
          `${trackerName}: Unexpected transition from ${CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED} into ${CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_COMPLETED} for ${uniqueTrackingId}`,
        );
        expect(result).toBe(false);
      });

      it('should return true for valid state transitions', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
          true,
        );
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED,
          true,
        );
        expect(result).toBe(true);
      });
    });

    describe('Non-streaming', () => {
      it('should return true if newState is REQUESTED', () => {
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
        );
        expect(result).toBe(true);
      });

      it("should return false when can't find suggestion in the state graph", () => {
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED,
        );
        expect(log.debug).toHaveBeenCalledWith(
          `${trackerName}: The suggestion with ${uniqueTrackingId} can't be found`,
        );
        expect(result).toBe(false);
      });

      it('should return false if transition is not allowed', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
        );
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN,
        );
        expect(log.debug).toHaveBeenCalledWith(
          `${trackerName}: Unexpected transition from ${CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED} into ${CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN} for ${uniqueTrackingId}`,
        );
        expect(result).toBe(false);
      });

      it('should return true for valid state transitions', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
        );
        const result = telemetryState.canUpdateState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED,
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('updateSuggestionState', () => {
    describe('Streaming', () => {
      it('should update state when allowed', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
          true,
        );
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED,
          true,
        );
        expect(log.debug).toHaveBeenCalledWith(
          `${trackerName}: ${uniqueTrackingId} transitioned from ${CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED} to ${CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED}`,
        );
      });

      it('should not update state when transition is not allowed', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
          true,
        );
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_COMPLETED,
          true,
        );
        expect(log.info).toHaveBeenCalledWith(
          `${trackerName}: ${uniqueTrackingId} state can't be updated.`,
        );
      });
    });

    describe('Non-streaming', () => {
      it('should update state when allowed', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
        );
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED,
        );
        expect(log.debug).toHaveBeenCalledWith(
          `${trackerName}: ${uniqueTrackingId} transitioned from ${CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED} to ${CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED}`,
        );
      });

      it('should not update state when transition is not allowed', () => {
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
        );
        telemetryState.updateSuggestionState(
          uniqueTrackingId,
          CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED,
        );
        expect(log.info).toHaveBeenCalledWith(
          `${trackerName}: ${uniqueTrackingId} state can't be updated.`,
        );
      });
    });
  });

  describe('getOpenedSuggestions', () => {
    it('should return opened suggestions tracking ids', () => {
      // opened suggestion
      const openSuggestionId = 'id1';
      telemetryState.updateSuggestionState(
        openSuggestionId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
      );
      telemetryState.updateSuggestionState(
        openSuggestionId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED,
      );
      telemetryState.updateSuggestionState(
        openSuggestionId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN,
      );
      // suggestion in end state
      const suggestionInEndStateId = 'id2';
      telemetryState.updateSuggestionState(
        suggestionInEndStateId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
      );
      telemetryState.updateSuggestionState(
        suggestionInEndStateId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED,
      );
      telemetryState.updateSuggestionState(
        suggestionInEndStateId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED,
      );
      // streaming suggestion in open state
      const openStreamingSuggestionId = 'id3';
      telemetryState.updateSuggestionState(
        openStreamingSuggestionId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
      );
      telemetryState.updateSuggestionState(
        openStreamingSuggestionId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED,
      );
      // streaming suggestion in end state
      const streamingSuggestionInEndStateId = 'id4';
      telemetryState.updateSuggestionState(
        streamingSuggestionInEndStateId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
      );
      telemetryState.updateSuggestionState(
        streamingSuggestionInEndStateId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED,
      );
      telemetryState.updateSuggestionState(
        streamingSuggestionInEndStateId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED,
      );

      expect(telemetryState.getOpenedSuggestions()).toEqual([
        openSuggestionId,
        openStreamingSuggestionId,
      ]);
    });
  });

  describe('deleteSuggestion', () => {
    it('should delete a suggestion by its ID', () => {
      telemetryState.updateSuggestionState(
        uniqueTrackingId,
        CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
      );
      telemetryState.deleteSuggestion(uniqueTrackingId);
      telemetryState.canUpdateState(uniqueTrackingId, CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED);
      expect(log.debug).toHaveBeenCalledWith(
        `${trackerName}: The suggestion with ${uniqueTrackingId} can't be found`,
      );
    });
  });
});

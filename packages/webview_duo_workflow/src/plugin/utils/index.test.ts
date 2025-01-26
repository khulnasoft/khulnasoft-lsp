import {
  DuoWorkflowEventConnection,
  DuoWorkflowStatus,
  ParsedDuoWorkflowEvent,
} from '@khulnasoft/webview-duo-workflow';
import {
  defaultCheckpoint,
  parsedLangGraphPayload,
  DUO_EVENT_PLANNING,
  DUO_EVENT_COMPLETED,
  DUO_EVENT_EXECUTING,
} from '../mock_data';
import {
  parseLangGraphCheckpoint,
  getLatestCheckpoint,
  getStatus,
  parseWorkflowData,
} from './index';

describe('index.ts', () => {
  describe('parseLangGraphCheckpoint', () => {
    it('should parse a valid JSON string', () => {
      const checkpoint = JSON.stringify({ key: 'value' });
      expect(parseLangGraphCheckpoint(checkpoint)).toEqual({ key: 'value' });
    });

    it('should throw an error for invalid JSON', () => {
      const invalidCheckpoint = 'invalid json';
      expect(() => parseLangGraphCheckpoint(invalidCheckpoint)).toThrow(
        'Failed to parse checkpoint',
      );
    });
  });

  describe('getLatestCheckpoint', () => {
    it('does not modify array in place', () => {
      const sortedCheckpoints = getLatestCheckpoint(parsedLangGraphPayload);
      expect(sortedCheckpoints).not.toBe(parsedLangGraphPayload);
    });

    it.each`
      checkpoints                                                       | expected               | desc
      ${[DUO_EVENT_PLANNING, DUO_EVENT_EXECUTING, DUO_EVENT_COMPLETED]} | ${DUO_EVENT_COMPLETED} | ${'when they are already in the correct order'}
      ${[DUO_EVENT_EXECUTING, DUO_EVENT_COMPLETED, DUO_EVENT_PLANNING]} | ${DUO_EVENT_COMPLETED} | ${'when they are not in the correct order'}
      ${[DUO_EVENT_PLANNING]}                                           | ${DUO_EVENT_PLANNING}  | ${'when there is only one checkpoint'}
      ${[]}                                                             | ${defaultCheckpoint}   | ${'when there are no checkpoints'}
    `(
      'sort checkpoints by timestamps from oldest to newest when $desc',
      ({ checkpoints, expected }) => {
        const latestCheckpoint = getLatestCheckpoint(checkpoints);
        expect(latestCheckpoint).toEqual(expected);
      },
    );
  });

  describe('getStatus', () => {
    it('should return the workflow status from the event', () => {
      const event: ParsedDuoWorkflowEvent = {
        metadata: '',
        errors: [],
        workflowStatus: DuoWorkflowStatus.FINISHED,
        checkpoint: { ts: '2023-01-01T00:00:00Z', channel_values: { status: 'Completed' } },
        workflowGoal: '',
      };
      expect(getStatus(event)).toBe(DuoWorkflowStatus.FINISHED);
    });
  });

  describe('parseWorkflowData', () => {
    it('should parse workflow data correctly', () => {
      const mockResponse: DuoWorkflowEventConnection = {
        duoWorkflowEvents: {
          nodes: [
            {
              checkpoint: JSON.stringify({
                channel_values: {
                  status: 'Execution',
                },
              }),
              errors: [],
              metadata: 'test-metadata',
              workflowStatus: DuoWorkflowStatus.RUNNING,
              workflowGoal: 'Fix this',
            },
          ],
        },
      };
      const expectedOutput = {
        metadata: 'test-metadata',
        errors: [],
        workflowStatus: DuoWorkflowStatus.RUNNING,
        checkpoint: {
          channel_values: {
            status: 'Execution',
          },
        },
        workflowGoal: 'Fix this',
      };
      const parsedData = parseWorkflowData(mockResponse);
      expect(parsedData).toEqual(expectedOutput);
    });
  });
});

import { TestLogger, Logger } from '@khulnasoft/logging';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { ConfigService, DefaultConfigService, KhulnaSoftApiClient, IDocContext } from '../..';
import { CIRCUIT_BREAK_INTERVAL_MS } from '../../circuit_breaker/circuit_breaker';
import { SuggestionOption } from '../../api_types';
import { InvalidInstanceVersionError } from '../../fetch_error';
import { DefaultCodeSuggestionsInstanceTracker } from './code_suggestions_instance_tracker';
import {
  INSTANCE_TRACKING_EVENTS_MAP,
  CODE_SUGGESTIONS_TRACKING_EVENTS,
  TELEMETRY_DISABLED_WARNING_MSG,
  TELEMETRY_ENABLED_MSG,
} from './constants';
import {
  ICodeSuggestionContextUpdate,
  ICodeSuggestionModel,
} from './code_suggestions_tracking_types';
import { generateUniqueTrackingId } from './utils';

jest.useFakeTimers();

const mockTrackEvent = jest.fn();
const mockDocumentContext: IDocContext = {
  prefix: 'beforeCursor',
  suffix: 'afterCursor',
  fileRelativePath: 'test.ts',
  position: {
    line: 0,
    character: 12,
  },
  uri: 'file:///test.ts',
  languageId: 'typescript',
};
const mockTimeStamp = '2024-07-06T01:41:39.207Z';
jest.spyOn(Date.prototype, 'toISOString').mockImplementation(() => mockTimeStamp);
jest.mock('../../log');

describe('InstanceTracker', () => {
  let instanceTracker: DefaultCodeSuggestionsInstanceTracker;
  const apiClient = createFakePartial<KhulnaSoftApiClient>({
    fetchFromApi: mockTrackEvent,
  });

  let configService: ConfigService;

  const uniqueTrackingId = generateUniqueTrackingId();

  let logger: Logger;

  const trackSuggestion = async (additionalContext?: Partial<ICodeSuggestionContextUpdate>) => {
    // currently api call is made for shown, accepted and rejected events
    // so that to  test 1 request, the suggestion
    // has to moved to shown state
    await instanceTracker.setCodeSuggestionsContext(uniqueTrackingId, {
      documentContext: mockDocumentContext,
    });

    instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

    if (additionalContext) {
      await instanceTracker.updateCodeSuggestionsContext(uniqueTrackingId, {
        ...additionalContext,
      });
    }
    instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);
  };
  const expectEvent = (event: string) => {
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ event }) }),
    );
  };

  const doNotExpectEvent = (event: string | null) => {
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ event }) }),
    );
  };

  beforeEach(() => {
    configService = new DefaultConfigService();
    logger = new TestLogger();
    jest.spyOn(logger, 'warn');
    jest.spyOn(logger, 'info');
    instanceTracker = new DefaultCodeSuggestionsInstanceTracker(apiClient, configService, logger);
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  describe('Reconfigure', () => {
    it('telemetry should be enabled by default', () => {
      expect(instanceTracker.isEnabled()).toBe(true);
    });

    it('should log telemetry status change message only once', () => {
      configService.set('client.telemetry.enabled', false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(TELEMETRY_DISABLED_WARNING_MSG),
        undefined,
      );
      expect(logger.warn).toHaveBeenCalledTimes(1);

      configService.set('client.telemetry.enabled', false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(TELEMETRY_DISABLED_WARNING_MSG),
        undefined,
      );
      expect(logger.warn).toHaveBeenCalledTimes(1);

      configService.set('client.telemetry.enabled', true);
      configService.set('client.telemetry.enabled', true);
      configService.set('client.telemetry.enabled', undefined);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(TELEMETRY_ENABLED_MSG),
        undefined,
      );
      expect(logger.info).toHaveBeenCalledTimes(1);
    });

    it('should be able to toggle telemetry', async () => {
      configService.set('client.telemetry.enabled', false);
      expect(instanceTracker.isEnabled()).toBe(false);
      await trackSuggestion();
      expect(mockTrackEvent).not.toHaveBeenCalled();
      configService.set('client.telemetry.enabled', true);
      expect(instanceTracker.isEnabled()).toBe(true);
      await trackSuggestion();
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Events', () => {
    const setRequestedState = () => {
      instanceTracker.setCodeSuggestionsContext(uniqueTrackingId, {
        documentContext: mockDocumentContext,
      });
    };

    const setLoadedState = () => {
      setRequestedState();
      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);
    };

    const setShownState = () => {
      setLoadedState();
      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);
    };

    const setRejectedState = () => {
      setShownState();
      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId);
    };

    const setAcceptedState = () => {
      setShownState();
      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED, uniqueTrackingId);
    };

    const stateFactories: Array<[CODE_SUGGESTIONS_TRACKING_EVENTS, () => void]> = [
      [CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, setShownState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, setRejectedState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED, setAcceptedState],
    ];

    it.each(stateFactories)('should track the %s event', (eventType, stateFactory) => {
      stateFactory();

      instanceTracker.trackEvent(eventType, uniqueTrackingId);
      const event = INSTANCE_TRACKING_EVENTS_MAP[eventType];

      if (event) {
        expectEvent(event);
      }
    });
  });

  describe('Tracking context', () => {
    it('should track event with the code suggestion data', async () => {
      await trackSuggestion();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            event: INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN],
            additional_properties: {
              unique_tracking_id: uniqueTrackingId,
              language: undefined,
              timestamp: mockTimeStamp,
              suggestion_size: 0,
            },
          },
        }),
      );
    });

    it('should update the context and track further events with it', async () => {
      const model: ICodeSuggestionModel = {
        engine: 'vertex-ai',
        name: 'code-gecko@latest',
        lang: 'js',
      };
      const suggestionOption1 = createFakePartial<SuggestionOption>({
        text: `This suggestion \n has 3 \n lines`,
      });
      const suggestionOption2 = createFakePartial<SuggestionOption>({
        text: `This suggestion \n has \n 4 \n lines`,
      });

      await trackSuggestion({
        model,
        suggestionOptions: [suggestionOption1, suggestionOption2],
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            event: INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN],
            additional_properties: {
              unique_tracking_id: uniqueTrackingId,
              language: model.lang,
              timestamp: mockTimeStamp,
              suggestion_size: 4,
            },
          },
        }),
      );
    });
  });

  describe('State management', () => {
    it('should send the states only of the supported events', () => {
      instanceTracker.setCodeSuggestionsContext(uniqueTrackingId, {
        documentContext: mockDocumentContext,
      });

      doNotExpectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED]);

      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

      doNotExpectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED]);

      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);
      expectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN]);
    });

    it('should update state of an existing suggestion when transition is valid', async () => {
      await trackSuggestion();
      mockTrackEvent.mockClear();
      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId);

      expectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED]);
    });

    it('should remove suggestions after 60s', () => {
      instanceTracker.setCodeSuggestionsContext(uniqueTrackingId, {
        documentContext: mockDocumentContext,
      });
      mockTrackEvent.mockClear();
      jest.advanceTimersByTime(60000);

      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

      expect(mockTrackEvent).toBeCalledTimes(0);
    });

    it('should not update state of an existing suggestion when transition is invalid', () => {
      // Sets suggestion state to `suggestion_requested`.
      instanceTracker.setCodeSuggestionsContext(uniqueTrackingId, {
        documentContext: mockDocumentContext,
      });
      mockTrackEvent.mockClear();
      // Invalid state transition: `suggestion_requested` to `suggestion_rejected`.
      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId);

      expect(mockTrackEvent).toBeCalledTimes(0);
    });

    it('should perform invalid transition when new state is "suggestion_accepted"', () => {
      instanceTracker.setCodeSuggestionsContext(uniqueTrackingId, {
        documentContext: mockDocumentContext,
      });
      mockTrackEvent.mockClear();
      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED, uniqueTrackingId);

      expect(mockTrackEvent).toBeCalledTimes(1);
      expectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED]);
    });

    it('should not update state if suggestion does not exist', () => {
      const nonExistentID = 'unknown';

      instanceTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, nonExistentID);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    describe('Rejection', () => {
      beforeEach(async () => {
        await trackSuggestion();
      });

      it('should reject all open suggestions', async () => {
        configService.set('client.telemetry.actions', [
          { action: CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED },
        ]);
        instanceTracker.setCodeSuggestionsContext(generateUniqueTrackingId(), {
          documentContext: mockDocumentContext,
        });
        expectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED]);
      });

      it('should not auto-reject suggestions when client registers that it sends rejections', async () => {
        configService.set('client.telemetry.actions', [
          { action: CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED },
        ]);

        instanceTracker.setCodeSuggestionsContext(generateUniqueTrackingId(), {
          documentContext: mockDocumentContext,
        });

        doNotExpectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED]);
      });

      it('should not auto-reject suggestions when client does not send accepted events', async () => {
        configService.set('client.telemetry.actions', []);

        instanceTracker.setCodeSuggestionsContext(uniqueTrackingId, {
          documentContext: mockDocumentContext,
        });

        doNotExpectEvent(INSTANCE_TRACKING_EVENTS_MAP[CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED]);
      });
    });
  });

  describe('Circuit breaking', () => {
    const turnOnCircuitBreaker = async () => {
      await trackSuggestion();
      await trackSuggestion();
      await trackSuggestion();
      await trackSuggestion();
    };

    it('starts breaking after 4 errors', async () => {
      jest.mocked(apiClient.fetchFromApi).mockRejectedValue(new Error('test problem'));
      await turnOnCircuitBreaker();

      jest.mocked(mockTrackEvent).mockClear();

      jest.mocked(apiClient.fetchFromApi).mockReset();
      jest.mocked(apiClient.fetchFromApi).mockResolvedValue(undefined);

      await trackSuggestion();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it(`starts tracking again after circuit breaker's break time elapses`, async () => {
      jest.useFakeTimers().setSystemTime(new Date(Date.now()));

      jest.mocked(apiClient.fetchFromApi).mockRejectedValue(new Error('test problem'));
      await turnOnCircuitBreaker();

      jest.mocked(mockTrackEvent).mockClear();

      jest.mocked(apiClient.fetchFromApi).mockReset();
      jest.mocked(apiClient.fetchFromApi).mockResolvedValue(undefined);
      jest.advanceTimersByTime(CIRCUIT_BREAK_INTERVAL_MS + 1);

      await trackSuggestion();
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Invalid instance error', () => {
    it('should log only once', async () => {
      const invalidInstanceError = new InvalidInstanceVersionError('invalid instance version ');
      jest.mocked(apiClient.fetchFromApi).mockRejectedValue(invalidInstanceError);

      await trackSuggestion();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      await trackSuggestion();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('should log other errors multiple times', async () => {
      const genericError = new Error('generic');
      jest.mocked(apiClient.fetchFromApi).mockRejectedValue(genericError);

      await trackSuggestion();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      await trackSuggestion();
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Streaming', () => {
    it('should not track events for streaming suggestion', async () => {
      jest.mocked(mockTrackEvent).mockClear();
      await trackSuggestion({ isStreaming: true });
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});

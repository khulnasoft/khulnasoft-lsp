import PQueue from 'p-queue';
import { createParser } from 'eventsource-parser';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { KhulnaSoftApiClient, GenerationType } from '../api';
import { AdditionalContext } from '../api_types';
import { waitMs } from '../utils/wait_ms';
import { CircuitBreaker } from '../circuit_breaker/circuit_breaker';
import { FetchError } from '../fetch_error';
import { createFakeResponse } from '../test_utils/create_fake_response';
import { IDocContext } from '../document_transformer_service';
import { CODE_SUGGESTIONS_TRACKING_EVENTS } from '../tracking/code_suggestions/constants';
import { PostProcessorPipeline } from '../suggestion_client/post_processors/post_processor_pipeline';
import { generateUniqueTrackingId } from '../tracking/code_suggestions/utils';
import { SuggestionApiErrorCheck } from '../feature_state/suggestion_api_error_check';
import { CodeSuggestionsTelemetryTracker } from '../tracking/code_suggestions/code_suggestions_multi_tracker';
import { log } from '../log';
import { DefaultStreamingHandler } from './streaming_handler';

jest.mock('../utils/wait_ms');
jest.mock('eventsource-parser', () => ({
  createParser: jest.fn(),
}));

const uniqueTrackingId = generateUniqueTrackingId();

describe('startStreaming', () => {
  const streamId = '1';
  let mockAPI: KhulnaSoftApiClient;
  let mockCircuitBreaker: CircuitBreaker;
  const mockContext: IDocContext = {
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
  let mockTelemetryTracker: CodeSuggestionsTelemetryTracker;
  let startStream: () => void;
  const additionalContexts = [createFakePartial<AdditionalContext>({ name: 'file.ts' })];
  let mockUserInstruction: jest.Mock;
  let mockGenerationType: jest.Mock;
  let mockNotifyFn: jest.Mock;
  let streamingHandler: DefaultStreamingHandler;

  const postProcessorPipeline = createFakePartial<PostProcessorPipeline>({
    run: jest.fn().mockImplementation(async (params) => params.input),
  });

  beforeEach(() => {
    jest.mocked(waitMs).mockResolvedValue(undefined);
    mockAPI = createFakePartial<KhulnaSoftApiClient>({
      getStreamingCodeSuggestions: jest.fn(),
    });
    mockCircuitBreaker = createFakePartial<CircuitBreaker>({
      error: jest.fn(),
      success: jest.fn(),
      isOpen: jest.fn(),
    });

    mockTelemetryTracker = createFakePartial<CodeSuggestionsTelemetryTracker>({
      setTrackingContext: jest.fn(),
      trackEvent: jest.fn(),
    });

    mockUserInstruction = jest.fn().mockReturnValue(undefined);
    mockGenerationType = jest.fn().mockReturnValue(undefined);

    startStream = () => {
      streamingHandler = new DefaultStreamingHandler(
        mockAPI,
        postProcessorPipeline,
        mockTelemetryTracker,
        mockCircuitBreaker as SuggestionApiErrorCheck,
      );
      mockNotifyFn = jest.fn();
      streamingHandler.init(mockNotifyFn);
      return streamingHandler.startStream({
        streamId,
        uniqueTrackingId,
        documentContext: mockContext,
        userInstruction: mockUserInstruction(),
        generationType: mockGenerationType(),
        additionalContexts,
      });
    };
  });

  it('should call the streaming API and send notifications to the client', async () => {
    mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {});

    await startStream();

    expect(mockAPI.getStreamingCodeSuggestions).toBeCalledTimes(1);
    expect(mockNotifyFn).toHaveBeenCalledWith({
      id: streamId,
      done: true,
    });
  });

  it('when multiple messages are send back, sends multiple notifications', async () => {
    mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
      yield {
        chunk: 'one',
        serverSentEvents: false,
      };
      yield {
        chunk: 'two',
        serverSentEvents: false,
      };
    });

    await startStream();

    expect(mockNotifyFn).toHaveBeenNthCalledWith(1, {
      id: streamId,
      completion: 'one',
      done: false,
    });
    expect(mockNotifyFn).toHaveBeenNthCalledWith(2, {
      id: streamId,
      completion: 'onetwo',
      done: false,
    });
    expect(mockNotifyFn).toHaveBeenNthCalledWith(3, {
      id: streamId,
      done: true,
    });
  });

  describe('User instruction', () => {
    it('should include user instruction if provided', async () => {
      const userInstruction = 'Refactor the following code';
      mockUserInstruction.mockReturnValue(userInstruction);

      mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
        yield {
          chunk: 'one',
          serverSentEvents: false,
        };
        yield {
          chunk: 'two',
          serverSentEvents: false,
        };
      });

      await startStream();

      expect(jest.mocked(mockAPI.getStreamingCodeSuggestions).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          user_instruction: userInstruction,
        }),
      );
    });

    it('should not include user instruction if not provided', async () => {
      mockUserInstruction.mockReturnValue(undefined);

      mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {});

      await startStream();

      expect(jest.mocked(mockAPI.getStreamingCodeSuggestions).mock.calls[0][0]).toEqual(
        expect.not.objectContaining({
          user_instruction: expect.any(String),
        }),
      );
    });
  });

  describe('Generation type', () => {
    const setupAndStartStream = async (generationType: GenerationType) => {
      mockGenerationType.mockReturnValue(generationType);
      mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {});

      return startStream();
    };

    it('should include generation type if provided', async () => {
      const generationType = 'comment';

      await setupAndStartStream(generationType);

      expect(jest.mocked(mockAPI.getStreamingCodeSuggestions).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          generation_type: generationType,
        }),
      );
    });

    it('should not include generation type if not provided', async () => {
      await setupAndStartStream(undefined);

      expect(jest.mocked(mockAPI.getStreamingCodeSuggestions).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          generation_type: undefined,
        }),
      );
    });
  });

  describe('cancellation', () => {
    it('cancels streaming on `CancelStreaming` notification', async () => {
      const promise = startStream();

      // manually call the callback that should be called on receiving notification
      streamingHandler.notificationHandler({ id: streamId });
      await promise;

      expect(mockNotifyFn).toHaveBeenCalledWith({
        id: streamId,
        done: true,
      });
    });
  });

  describe('circuit breaker', () => {
    it('should close the circuit once streaming is starting', async () => {
      mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {});

      await startStream();

      expect(mockCircuitBreaker.success).toHaveBeenCalled();
    });

    it('should add to errors on api error', async () => {
      mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
        yield Promise.reject(new Error('error'));
      });

      await startStream();

      expect(mockCircuitBreaker.error).toHaveBeenCalled();
    });

    it('should not proceed with API calls when the circuit is open', async () => {
      mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
        yield {
          chunk: 'one',
          serverSentEvents: false,
        };
      });

      jest.mocked(mockCircuitBreaker.isOpen).mockReturnValue(true);

      await startStream();

      expect(mockNotifyFn).not.toHaveBeenCalledWith({
        completion: 1,
        done: false,
        id: streamId,
      });
    });
  });

  describe('Telemetry', () => {
    const checkInitialContext = () => {
      expect(mockTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
        uniqueTrackingId,
        context: expect.objectContaining({
          documentContext: expect.any(Object),
          source: 'network',
          isStreaming: true,
          additionalContexts,
        }),
      });
    };

    describe('Successfully completed stream', () => {
      it('should track correct events', async () => {
        mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
          yield {
            chunk: 'one',
            serverSentEvents: false,
          };
          yield {
            chunk: 'two',
            serverSentEvents: false,
          };
        } satisfies typeof mockAPI.getStreamingCodeSuggestions);
        await startStream();
        checkInitialContext();

        expect(jest.mocked(mockTelemetryTracker.trackEvent).mock.calls).toEqual([
          [CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_COMPLETED, uniqueTrackingId],
        ]);
      });
    });

    describe('Errored stream', () => {
      it('should track correct events', async () => {
        const errorStatusCode = 400;
        const response = createFakeResponse({
          url: 'https://example.com/api/v4/project',
          status: errorStatusCode,
          text: 'Bad Request',
        });
        mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
          yield {
            chunk: 'one',
            serverSentEvents: false,
          };
          yield Promise.reject(new FetchError(response, 'completion'));
        });
        await startStream();
        checkInitialContext();

        expect(mockTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
          uniqueTrackingId,
          context: {
            status: errorStatusCode,
          },
        });
        expect(jest.mocked(mockTelemetryTracker.trackEvent).mock.calls).toEqual([
          [CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED, uniqueTrackingId],
        ]);
      });
    });

    describe('Cancelled stream', () => {
      it('should track correct events', async () => {
        mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
          yield {
            chunk: 'one',
            serverSentEvents: false,
          };
          yield {
            chunk: 'two',
            serverSentEvents: false,
          };
        });
        const promise = startStream();

        // manually call the callback that should be called on receiving notification
        streamingHandler.notificationHandler({ id: streamId });
        await promise;

        checkInitialContext();
        expect(jest.mocked(mockTelemetryTracker.trackEvent).mock.calls).toEqual([
          [CODE_SUGGESTIONS_TRACKING_EVENTS.CANCELLED, uniqueTrackingId],
        ]);
      });
    });

    describe('Empty stream (no suggestion provided)', () => {
      it('should track correct events', async () => {
        mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
          yield {
            chunk: '    ',
            serverSentEvents: false,
          };
          yield {
            chunk: '',
            serverSentEvents: false,
          };
        });
        await startStream();

        expect(jest.mocked(mockTelemetryTracker.trackEvent).mock.calls).toEqual([
          [CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_COMPLETED, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED, uniqueTrackingId],
        ]);
      });
    });

    describe('Rejected stream', () => {
      jest.useFakeTimers();

      it('should track correct events', async () => {
        mockAPI.getStreamingCodeSuggestions = jest.fn().mockImplementation(async function* () {
          yield {
            chunk: 'one',
            serverSentEvents: false,
          };
          yield new Promise((resolve) => {
            // manually call the callback that should be called on receiving notification
            streamingHandler.notificationHandler({ id: streamId });
            resolve('two');
          });
        });
        await startStream();

        jest.runOnlyPendingTimers();
        checkInitialContext();

        expect(jest.mocked(mockTelemetryTracker.trackEvent).mock.calls).toEqual([
          [CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId],
        ]);
      });
    });
  });
});

describe('SSE Parsing', () => {
  let handler: DefaultStreamingHandler;
  let mockApi: KhulnaSoftApiClient;
  let mockPostProcessor: PostProcessorPipeline;
  let mockTracker: CodeSuggestionsTelemetryTracker;
  let mockApiErrorCheck: SuggestionApiErrorCheck;
  let queue: PQueue;
  let mockNotifyFn: jest.Mock;

  const mockDocContext: IDocContext = createFakePartial<IDocContext>({});

  beforeEach(() => {
    mockApi = createFakePartial<KhulnaSoftApiClient>({
      getStreamingCodeSuggestions: jest.fn(),
    });
    mockPostProcessor = createFakePartial<PostProcessorPipeline>({
      run: jest.fn(),
    });
    mockTracker = createFakePartial<CodeSuggestionsTelemetryTracker>({
      trackEvent: jest.fn(),
      setTrackingContext: jest.fn(),
      isEnabled: jest.fn(),
    });
    mockApiErrorCheck = createFakePartial<SuggestionApiErrorCheck>({
      success: jest.fn(),
      error: jest.fn(),
      isOpen: jest.fn().mockReturnValue(false),
    });

    mockNotifyFn = jest.fn();
    handler = new DefaultStreamingHandler(
      mockApi,
      mockPostProcessor,
      mockTracker,
      mockApiErrorCheck,
    );
    handler.init(mockNotifyFn);

    queue = new PQueue({ concurrency: 1 });
  });

  it('handles stream_start event with model metadata', async () => {
    const mockParser = {
      feed: jest.fn(),
    };
    (createParser as jest.Mock).mockReturnValue(mockParser);

    await handler.startStream({
      streamId: 'stream-1',
      uniqueTrackingId: 'test-id',
      documentContext: mockDocContext,
    });

    const { onEvent } = (createParser as jest.Mock).mock.calls[0][0];

    onEvent({
      event: 'stream_start',
      data: JSON.stringify({
        metadata: {
          model: {
            engine: 'test-engine',
            name: 'test-model',
          },
        },
      }),
    });

    expect(mockTracker.setTrackingContext).toHaveBeenCalledWith({
      uniqueTrackingId: 'test-id',
      context: {
        model: {
          engine: 'test-engine',
          name: 'test-model',
        },
      },
    });
  });

  it('handles content_chunk events and accumulates content', async () => {
    const mockParser = {
      feed: jest.fn(),
    };
    (createParser as jest.Mock).mockReturnValue(mockParser);

    await handler.startStream({
      streamId: 'stream-1',
      uniqueTrackingId: 'test-id',
      documentContext: mockDocContext,
    });

    const { onEvent } = (createParser as jest.Mock).mock.calls[0][0];

    onEvent({
      event: 'content_chunk',
      data: JSON.stringify({
        choices: [
          { delta: { content: 'Hello' }, index: 0 },
          { delta: { content: ' World' }, index: 0 },
        ],
      }),
    });

    await queue.onIdle();

    expect(mockPostProcessor.run).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          completion: 'Hello World',
        }),
      }),
    );
  });

  it('handles stream_end event', async () => {
    const mockParser = {
      feed: jest.fn(),
    };
    (createParser as jest.Mock).mockReturnValue(mockParser);

    await handler.startStream({
      streamId: 'stream-1',
      uniqueTrackingId: 'test-id',
      documentContext: mockDocContext,
    });

    const { onEvent } = (createParser as jest.Mock).mock.calls[0][0];

    onEvent({
      event: 'stream_end',
      data: JSON.stringify({
        metadata: {
          model: {
            engine: 'test-engine',
            name: 'test-model',
          },
        },
      }),
    });
  });

  it('handles invalid SSE events gracefully', async () => {
    const mockParser = {
      feed: jest.fn(),
    };
    (createParser as jest.Mock).mockReturnValue(mockParser);

    const logErrorSpy = jest.spyOn(log, 'error').mockImplementation();

    await handler.startStream({
      streamId: 'stream-1',
      uniqueTrackingId: 'test-id',
      documentContext: mockDocContext,
    });

    const { onEvent } = (createParser as jest.Mock).mock.calls[0][0];

    onEvent({
      event: 'invalid_event',
      data: 'invalid json',
    });

    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error streaming code suggestions'),
      expect.any(Object),
    );

    logErrorSpy.mockRestore();
  });
});

import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { once } from 'lodash';
import {
  CancellationToken,
  CancellationTokenSource,
  NotificationHandler,
} from 'vscode-languageserver';
import { Disposable } from '@khulnasoft/disposable';
import { createParser } from 'eventsource-parser';
import PQueue from 'p-queue';
import { z } from 'zod';
import { CodeSuggestionRequest, KhulnaSoftApiClient, GenerationType } from '../api';
import { AdditionalContext } from '../api_types';
import { CircuitBreaker } from '../circuit_breaker/circuit_breaker';
import { IDocContext } from '../document_transformer_service';
import { log } from '../log';
import { CODE_SUGGESTIONS_TRACKING_EVENTS } from '../tracking/code_suggestions/constants';
import { SuggestionSource } from '../tracking/code_suggestions/code_suggestions_tracking_types';
import { PostProcessorPipeline } from '../suggestion_client/post_processors/post_processor_pipeline';
import { Notifier, NotifyFn } from '../notifier';
import { StreamingCompletionResponse, StreamWithId } from '../notifications';
import { SuggestionApiErrorCheck } from '../feature_state/suggestion_api_error_check';
import { CodeSuggestionsTelemetryTracker } from '../tracking/code_suggestions/code_suggestions_multi_tracker';
import { isFetchError } from '../fetch_error';

export interface StartStreamParams {
  streamId: string;
  uniqueTrackingId: string;
  documentContext: IDocContext;
  userInstruction?: string;
  generationType?: GenerationType;
  additionalContexts?: AdditionalContext[];
  contextProjectPath?: string;
}

const ChoiceSchema = z.object({
  delta: z.object({
    content: z.string(),
  }),
  index: z.number(),
});

const SSEEventDataSchema = z.object({
  metadata: z
    .object({
      model: z
        .object({
          engine: z.string(),
          name: z.string(),
        })
        .optional(),
      timestamp: z.number().optional(),
    })
    .optional(),
  choices: z.array(ChoiceSchema).optional(),
});

const SSEEventSchema = z.object({
  event: z.enum(['stream_start', 'content_chunk', 'stream_end']),
  data: SSEEventDataSchema.nullable().optional(),
});

export interface StreamingHandler extends Notifier<StreamingCompletionResponse> {
  notificationHandler: NotificationHandler<StreamWithId>;
  startStream({
    additionalContexts,
    documentContext,
    streamId,
    uniqueTrackingId,
    userInstruction,
    generationType,
    contextProjectPath,
  }: StartStreamParams): Promise<void>;
}

export const StreamingHandler = createInterfaceId<StreamingHandler>('StreamingHandler');

@Injectable(StreamingHandler, [
  KhulnaSoftApiClient,
  PostProcessorPipeline,
  CodeSuggestionsTelemetryTracker,
  SuggestionApiErrorCheck,
])
export class DefaultStreamingHandler implements StreamingHandler {
  #api: KhulnaSoftApiClient;

  #postProcessorPipeline: PostProcessorPipeline;

  #tracker: CodeSuggestionsTelemetryTracker;

  #streamCancellations: Map<string, () => void> = new Map();

  #streamingCompletionNotifyFn: NotifyFn<StreamingCompletionResponse> | undefined;

  #circuitBreaker: CircuitBreaker;

  constructor(
    api: KhulnaSoftApiClient,
    postProcessorPipeline: PostProcessorPipeline,
    telemetryTracker: CodeSuggestionsTelemetryTracker,
    apiErrorCheck: SuggestionApiErrorCheck,
  ) {
    this.#api = api;
    this.#postProcessorPipeline = postProcessorPipeline;
    this.#tracker = telemetryTracker;
    this.#circuitBreaker = apiErrorCheck;
  }

  init(streamingCompletionNotifyFn: NotifyFn<StreamingCompletionResponse>) {
    this.#streamingCompletionNotifyFn = streamingCompletionNotifyFn;
  }

  notificationHandler(stream: StreamWithId): void {
    const cancellationHandler = this.#streamCancellations.get(stream.id);
    if (!cancellationHandler) {
      log.warn(
        `StreamingHandler received notification to close stream id ${stream.id} but the cancellation handler is missing.`,
      );
      return;
    }
    cancellationHandler();
  }

  #onStreamCancellation(streamId: string, listener: () => void): Disposable {
    this.#streamCancellations.set(streamId, listener);
    return {
      dispose: () => {
        this.#streamCancellations.delete(streamId);
      },
    };
  }

  #sendStreamingResponse(response: StreamingCompletionResponse) {
    if (!this.#streamingCompletionNotifyFn) {
      throw new Error(
        'The StreamingHandler has not been initialized. This is non-recoverable error and needs a bug-fix. Please create an issue.',
      );
    }
    return this.#streamingCompletionNotifyFn(response);
  }

  async startStream({
    additionalContexts,
    documentContext,
    streamId,
    uniqueTrackingId,
    userInstruction,
    generationType,
    contextProjectPath,
  }: StartStreamParams) {
    this.#tracker.setTrackingContext?.({
      uniqueTrackingId,
      context: {
        documentContext,
        additionalContexts,
        source: SuggestionSource.network,
        isStreaming: true,
      },
    });

    let streamShown = false;
    let suggestionProvided = false;
    let streamCancelledOrErrored = false;

    const cancellationTokenSource = new CancellationTokenSource();
    const disposeStopStreaming = this.#onStreamCancellation(streamId, () => {
      streamCancelledOrErrored = true;
      cancellationTokenSource.cancel();

      if (streamShown) {
        this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId);
      } else {
        this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.CANCELLED, uniqueTrackingId);
      }
    });
    const cancellationToken = cancellationTokenSource.token;

    const updateSuggestionProvided = (provided: boolean) => {
      suggestionProvided = provided;
    };

    const endStream = async () => {
      await this.#sendStreamingResponse({
        id: streamId,
        done: true,
      });

      if (!streamCancelledOrErrored) {
        this.#tracker.trackEvent(
          CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_COMPLETED,
          uniqueTrackingId,
        );

        if (!suggestionProvided) {
          this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED, uniqueTrackingId);
        }
      }
    };

    this.#circuitBreaker.success();

    const request: CodeSuggestionRequest = {
      prompt_version: 1,
      project_path: contextProjectPath ?? '',
      project_id: -1,
      current_file: {
        content_above_cursor: documentContext.prefix,
        content_below_cursor: documentContext.suffix,
        file_name: documentContext.fileRelativePath,
      },
      intent: 'generation',
      stream: true,
      ...(additionalContexts?.length && {
        context: additionalContexts,
      }),
      ...(userInstruction && {
        user_instruction: userInstruction,
      }),
      generation_type: generationType,
    };

    const trackStreamStarted = once(() => {
      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.STREAM_STARTED, uniqueTrackingId);
    });

    const trackStreamShown = once(() => {
      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);
      streamShown = true;
    });

    const queue = new PQueue({ concurrency: 1 });

    const handleError = (err: unknown) => {
      this.#circuitBreaker.error();
      if (isFetchError(err)) {
        this.#tracker.setTrackingContext?.({
          uniqueTrackingId,
          context: { status: err.status },
        });
      }
      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED, uniqueTrackingId);
      streamCancelledOrErrored = true;
      log.error('Error streaming code suggestions.', err);
    };

    let legacyStreamBuffer = '';
    const sseParser = this.#createSSEParser({
      uniqueTrackingId,
      documentContext,
      streamId,
      trackStreamStarted,
      trackStreamShown,
      cancellationToken,
      queue,
      handleError,
      endStream,
      updateSuggestionProvided,
      streamCancelledOrErrored,
    });

    const stream = this.#api.getStreamingCodeSuggestions(request, cancellationToken);

    if (!stream) {
      await endStream();
      disposeStopStreaming.dispose();
      cancellationTokenSource.dispose();
      return;
    }

    try {
      for await (const item of stream) {
        if (item.serverSentEvents) {
          sseParser.feed(item.chunk);
        } else {
          // TODO: remove this once we've fully migrated to SSE streaming
          legacyStreamBuffer += item.chunk;
          await this.#handleStreamNotification({
            buffer: legacyStreamBuffer,
            cancellationToken,
            documentContext,
            streamId,
            trackStreamStarted,
          });
          if (legacyStreamBuffer.replace(/\s/g, '').length && !streamCancelledOrErrored) {
            trackStreamShown();
            updateSuggestionProvided(true);
          }
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      await queue.onIdle();
      await endStream();
      disposeStopStreaming.dispose();
      cancellationTokenSource.dispose();
    }
  }

  /**
   * Creates a parser that parses the SSE events and handles the stream notifications.
   *
   * Note: we've added a queue to ensure that the stream notifications are processed in order.
   */
  #createSSEParser({
    uniqueTrackingId,
    documentContext,
    streamId,
    trackStreamStarted,
    trackStreamShown,
    cancellationToken,
    queue,
    handleError,
    endStream,
    updateSuggestionProvided,
    streamCancelledOrErrored,
  }: {
    uniqueTrackingId: string;
    documentContext: IDocContext;
    streamId: string;
    trackStreamStarted: () => void;
    trackStreamShown: () => void;
    cancellationToken: CancellationToken;
    queue: PQueue;
    handleError: (err: unknown) => void;
    endStream: () => Promise<void>;
    updateSuggestionProvided: (provided: boolean) => void;
    streamCancelledOrErrored: boolean;
  }) {
    let sseBuffer = '';
    return createParser({
      onEvent: async (e) => {
        try {
          log.debug(`Received SSE event: ${e.event} ${JSON.stringify(JSON.parse(e.data))}`);
          const parseResult = SSEEventSchema.safeParse({
            event: e.event,
            data: JSON.parse(e.data),
          });
          if (!parseResult.success) {
            log.error(`Invalid SSE event data: ${JSON.stringify(e)} ${parseResult.error}`);
            return;
          }
          const { data: event } = parseResult;
          if (event.event === 'stream_start') {
            log.debug(`Setting model metadata: ${JSON.stringify(event.data?.metadata?.model)}`);
            this.#tracker.setTrackingContext?.({
              uniqueTrackingId,
              context: {
                model: event.data?.metadata?.model,
              },
            });
          }
          if (event?.event === 'content_chunk') {
            if (event.data?.choices) {
              for (const choice of event.data.choices) {
                sseBuffer += choice.delta.content;
              }
              if (sseBuffer.replace(/\s/g, '').length && !streamCancelledOrErrored) {
                trackStreamShown();
                updateSuggestionProvided(true);
              }
            }
          }
          if (event?.event === 'stream_end') {
            updateSuggestionProvided(true);
          }

          // eslint-disable-next-line no-void
          void queue.add(async () =>
            this.#handleStreamNotification({
              buffer: sseBuffer,
              cancellationToken,
              documentContext,
              streamId,
              trackStreamStarted,
            }),
          );
        } catch (err) {
          handleError(err);
          await endStream();
        }
      },
    });
  }

  /**
   * Handles the stream notification.
   *
   * This is shared between the legacy stream and the SSE stream.
   */
  async #handleStreamNotification({
    buffer,
    cancellationToken,
    documentContext,
    streamId,
    trackStreamStarted,
  }: {
    buffer: string;
    cancellationToken: CancellationToken;
    documentContext: IDocContext;
    streamId: string;
    trackStreamStarted: () => void;
  }) {
    if (cancellationToken.isCancellationRequested) {
      return;
    }

    if (this.#circuitBreaker.isOpen()) {
      return;
    }

    trackStreamStarted();

    const processedCompletion = await this.#postProcessorPipeline.run({
      documentContext,
      input: { id: streamId, completion: buffer, done: false },
    });
    await this.#sendStreamingResponse(processedCompletion);
  }
}

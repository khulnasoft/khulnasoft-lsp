import { uniqueId } from 'lodash';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import {
  CancellationToken,
  CompletionItem,
  CompletionParams,
  Disposable,
  InitializeParams,
  InlineCompletionContext,
  InlineCompletionList,
  InlineCompletionParams,
  InlineCompletionTriggerKind,
  Position,
  TextDocumentIdentifier,
} from 'vscode-languageserver';
import {
  advancedContextToRequestBody,
  getAdvancedContext,
} from '../advanced_context/advanced_context_factory';
import { shouldUseAdvancedContext } from '../advanced_context/helpers';
import {
  KhulnaSoftApiClient,
  StartStreamOption,
  SuggestionOptionOrStream,
  GenerationType,
} from '../api';
import { AdditionalContext, SuggestionOption } from '../api_types';
import { CircuitBreaker } from '../circuit_breaker/circuit_breaker';
import { ConfigService, ClientConfig } from '../config_service';
import { DocumentTransformerService, IDocContext } from '../document_transformer_service';
import { ClientFeatureFlags, FeatureFlagService } from '../feature_flags';
import { isFetchError } from '../fetch_error';
import { log } from '../log';
import { DuoProjectAccessChecker } from '../services/duo_access';
import {
  MANUAL_REQUEST_OPTIONS_COUNT,
  OptionsCount,
  DefaultSuggestionClient,
  SuggestionClientPipeline,
  createTreeSitterMiddleware,
} from '../suggestion_client';
import { CODE_SUGGESTIONS_TRACKING_EVENTS } from '../tracking/code_suggestions/constants';
import { canClientTrackEvent, generateUniqueTrackingId } from '../tracking/code_suggestions/utils';
import { IntentResolution, TreeSitterParser, getIntent } from '../tree_sitter';
import {
  completionOptionMapper,
  inlineCompletionOptionMapper,
  isStream,
  isTextSuggestion,
} from '../utils/suggestion_mappers';
import { FallbackClient } from '../suggestion_client/fallback_client';
import { DirectConnectionClient } from '../suggestion_client/direct_connection_client';
import { clientToMiddleware } from '../suggestion_client/client_to_middleware';
import { SuggestionSource } from '../tracking/code_suggestions/code_suggestions_tracking_types';
import { IClientContext } from '../tracking/snowplow/constants';
import { PostProcessorPipeline } from '../suggestion_client/post_processors/post_processor_pipeline';
import { SUGGESTIONS_DEBOUNCE_INTERVAL_MS } from '../constants';
import { SuggestionApiErrorCheck } from '../feature_state/suggestion_api_error_check';
import { ErrorHandler } from '../errors/error_handler';
import { SanitizedError } from '../errors/sanitized_error';
import { extractScript } from '../utils/vue_utils';
import { waitMs } from '../utils/wait_ms';
import { CodeSuggestionsTelemetryTracker } from '../tracking/code_suggestions/code_suggestions_multi_tracker';
import {
  isAtOrNearEndOfLine,
  shouldRejectCompletionWithSelectedCompletionTextMismatch,
} from './suggestion_filter';
import { SuggestionsCache } from './suggestions_cache';
import { StreamingHandler } from './streaming_handler';
import { SupportedLanguagesService } from './supported_languages_service';

export type ChangeConfigOptions = { settings: ClientConfig };

export type CustomInitializeParams = InitializeParams & {
  initializationOptions?: IClientContext;
};

export const WORKFLOW_MESSAGE_NOTIFICATION = '$/gitlab/workflowMessage';

export interface ITelemetryNotificationParams {
  category: 'code_suggestions';
  action: CODE_SUGGESTIONS_TRACKING_EVENTS;
  context: {
    trackingId: string;
    optionId?: number;
  };
}

export interface IStartWorkflowParams {
  goal: string;
  image: string;
}

/* CompletionRequest represents LS client's request for either completion or inlineCompletion */
export interface CompletionRequest {
  textDocument: TextDocumentIdentifier;
  position: Position;
  token: CancellationToken;
  inlineCompletionContext?: InlineCompletionContext;
}

export interface SuggestionService {
  completionHandler: (
    params: CompletionParams,
    token: CancellationToken,
  ) => Promise<CompletionItem[]>;
  inlineCompletionHandler: (
    params: InlineCompletionParams,
    token: CancellationToken,
  ) => Promise<InlineCompletionList>;
}

export const SuggestionService = createInterfaceId<SuggestionService>('SuggestionService');

@Injectable(SuggestionService, [
  CodeSuggestionsTelemetryTracker,
  ConfigService,
  KhulnaSoftApiClient,
  ErrorHandler,
  DocumentTransformerService,
  TreeSitterParser,
  FeatureFlagService,
  DuoProjectAccessChecker,
  SupportedLanguagesService,
  SuggestionApiErrorCheck,
  PostProcessorPipeline,
  StreamingHandler,
])
export class DefaultSuggestionService implements SuggestionService {
  readonly #suggestionClientPipeline: SuggestionClientPipeline;

  #configService: ConfigService;

  #api: KhulnaSoftApiClient;

  #tracker: CodeSuggestionsTelemetryTracker;

  #errorHandler: ErrorHandler;

  #documentTransformerService: DocumentTransformerService;

  #circuitBreaker: CircuitBreaker;

  #subscriptions: Disposable[] = [];

  #suggestionsCache: SuggestionsCache;

  #treeSitterParser: TreeSitterParser;

  #duoProjectAccessChecker: DuoProjectAccessChecker;

  #supportedLanguagesService: SupportedLanguagesService;

  #featureFlagService: FeatureFlagService;

  #postProcessorPipeline: PostProcessorPipeline;

  #streamingHandler: StreamingHandler;

  constructor(
    telemetryTracker: CodeSuggestionsTelemetryTracker,
    configService: ConfigService,
    api: KhulnaSoftApiClient,
    errorHandler: ErrorHandler,
    documentTransformerService: DocumentTransformerService,
    treeSitterParser: TreeSitterParser,
    featureFlagService: FeatureFlagService,
    duoProjectAccessChecker: DuoProjectAccessChecker,
    supportedLanguagesService: SupportedLanguagesService,
    suggestionApiErrorCheck: SuggestionApiErrorCheck,
    postProcessorPipeline: PostProcessorPipeline,
    streamingHandler: StreamingHandler,
  ) {
    this.#configService = configService;
    this.#api = api;
    this.#tracker = telemetryTracker;
    this.#errorHandler = errorHandler;
    this.#documentTransformerService = documentTransformerService;
    this.#suggestionsCache = new SuggestionsCache(this.#configService);
    this.#treeSitterParser = treeSitterParser;
    this.#featureFlagService = featureFlagService;
    this.#circuitBreaker = suggestionApiErrorCheck;
    this.#postProcessorPipeline = postProcessorPipeline;
    this.#streamingHandler = streamingHandler;

    const suggestionClient = new FallbackClient(
      new DirectConnectionClient(this.#api, this.#configService),
      new DefaultSuggestionClient(this.#api),
    );

    this.#suggestionClientPipeline = new SuggestionClientPipeline([
      clientToMiddleware(suggestionClient),
      createTreeSitterMiddleware({
        treeSitterParser,
        getIntentFn: getIntent,
      }),
    ]);

    this.#duoProjectAccessChecker = duoProjectAccessChecker;
    this.#supportedLanguagesService = supportedLanguagesService;
  }

  completionHandler = async (
    { textDocument, position }: CompletionParams,
    token: CancellationToken,
  ): Promise<CompletionItem[]> => {
    log.debug('Completion requested');
    const suggestionOptions = await this.#getSuggestionOptions({ textDocument, position, token });
    if (suggestionOptions.find(isStream)) {
      log.warn(
        `Completion response unexpectedly contained streaming response. Streaming for completion is not supported. Please report this issue.`,
      );
    }
    return completionOptionMapper(suggestionOptions.filter(isTextSuggestion));
  };

  #getSuggestionOptions = async (
    request: CompletionRequest,
  ): Promise<SuggestionOptionOrStream[]> => {
    const { textDocument, position, token, inlineCompletionContext: context } = request;
    const suggestionContext = this.#documentTransformerService.getContext(
      textDocument.uri,
      position,
      this.#configService.get('client.workspaceFolders') ?? [],
      context,
    );

    if (!suggestionContext) {
      return [];
    }

    const cachedSuggestions = this.#useAndTrackCachedSuggestions(
      textDocument,
      position,
      suggestionContext,
      context?.triggerKind,
    );

    if (context?.triggerKind === InlineCompletionTriggerKind.Invoked) {
      const options = await this.#handleNonStreamingCompletion(request, suggestionContext);

      options.unshift(...(cachedSuggestions ?? []));
      (cachedSuggestions ?? []).forEach((cs) =>
        this.#tracker.setTrackingContext?.({
          uniqueTrackingId: cs.uniqueTrackingId,
          context: {
            optionsCount: options.length,
            suggestionOptions: cachedSuggestions,
          },
        }),
      );

      return options;
    }

    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    // debounce
    await waitMs(SUGGESTIONS_DEBOUNCE_INTERVAL_MS);
    if (token.isCancellationRequested) {
      log.debug('Debounce triggered for completion');
      return [];
    }

    if (
      context &&
      shouldRejectCompletionWithSelectedCompletionTextMismatch(
        context,
        this.#documentTransformerService.get(textDocument.uri),
      )
    ) {
      return [];
    }

    const additionalContexts = await this.#getAdditionalContexts(suggestionContext);

    // right now we only support streaming for inlineCompletion
    // if the context is present, we know we are handling inline completion
    if (
      context &&
      this.#featureFlagService.isClientFlagEnabled(ClientFeatureFlags.StreamCodeGenerations)
    ) {
      const intentResolution = await this.#getIntent(suggestionContext);

      if (intentResolution?.intent === 'generation') {
        return this.#handleStreamingInlineCompletion(
          suggestionContext,
          intentResolution.commentForCursor?.content,
          intentResolution.generationType,
          additionalContexts,
        );
      }
    }

    return this.#handleNonStreamingCompletion(request, suggestionContext, additionalContexts);
  };

  inlineCompletionHandler = async (
    params: InlineCompletionParams,
    token: CancellationToken,
  ): Promise<InlineCompletionList> => {
    log.debug('Inline completion requested');

    const options = await this.#getSuggestionOptions({
      textDocument: params.textDocument,
      position: params.position,
      token,
      inlineCompletionContext: params.context,
    });
    return inlineCompletionOptionMapper(params, options);
  };

  async #handleStreamingInlineCompletion(
    context: IDocContext,
    userInstruction?: string,
    generationType?: GenerationType,
    additionalContexts?: AdditionalContext[],
  ): Promise<StartStreamOption[]> {
    if (this.#circuitBreaker.isOpen()) {
      log.warn('Stream was not started as the circuit breaker is open.');
      return [];
    }

    let contextProjectPath: string | undefined;

    if (context.workspaceFolder) {
      const { project } = this.#duoProjectAccessChecker.checkProjectStatus(
        context.uri,
        context.workspaceFolder,
      );

      contextProjectPath = project?.namespaceWithPath;
    }

    const streamId = uniqueId('code-suggestion-stream-');
    const uniqueTrackingId = generateUniqueTrackingId();

    setTimeout(() => {
      log.debug(`Starting to stream (id: ${streamId})`);

      this.#streamingHandler
        .startStream({
          streamId,
          uniqueTrackingId,
          documentContext: context,
          userInstruction,
          generationType,
          additionalContexts,
          contextProjectPath,
        })
        .catch((e: Error) => this.#errorHandler.handleError('Failed to start streaming', e));
    }, 0);

    return [{ streamId, uniqueTrackingId }];
  }

  async #handleNonStreamingCompletion(
    request: CompletionRequest,
    documentContext: IDocContext,
    additionalContexts?: AdditionalContext[],
  ): Promise<SuggestionOption[]> {
    const uniqueTrackingId: string = generateUniqueTrackingId();

    try {
      return await this.#getSuggestions({
        request,
        uniqueTrackingId,
        documentContext,
        additionalContexts,
      });
    } catch (e) {
      if (isFetchError(e)) {
        this.#tracker.setTrackingContext?.({
          uniqueTrackingId,
          context: { status: e.status },
        });
      }
      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED, uniqueTrackingId);
      this.#circuitBreaker.error();
      this.#errorHandler.handleError(
        'Failed to get code suggestions!',
        new SanitizedError('Failed to get code suggestions!', e),
      );
      return [];
    }
  }

  /**
   * FIXME: unify how we get code completion and generation
   * so we don't have duplicate intent detection (see `tree_sitter_middleware.ts`)
   * */
  async #getIntent(context: IDocContext): Promise<IntentResolution | undefined> {
    try {
      let treeAndLanguage;
      let position;

      // Vue files require special handling because we do not have a tree-sitter parser for Vue
      // We need to extract the script content and adjust the cursor position to properly analyze
      // the JavaScript portion of the Vue file.
      if (context.languageId === 'vue') {
        const scriptResult = extractScript(context.prefix + context.suffix);
        if (!scriptResult) return undefined;

        const { scriptContent, scriptStartCharacter, scriptStartLine, language } = scriptResult;
        treeAndLanguage = await this.#treeSitterParser.parseContent(scriptContent, language);

        // Adjust position: map cursor from full Vue file to script content
        position = {
          line: context.position.line - scriptStartLine,
          character: context.position.character - scriptStartCharacter,
        };
      } else {
        treeAndLanguage = await this.#treeSitterParser.parseFile(context);
        position = context.position;
      }

      if (!treeAndLanguage) {
        return undefined;
      }
      return await getIntent({
        treeAndLanguage,
        position,
        prefix: context.prefix,
        suffix: context.suffix,
      });
    } catch (error) {
      this.#errorHandler.handleError('Failed to parse with tree sitter', error);
      return undefined;
    }
  }

  #trackShowIfNeeded(uniqueTrackingId: string) {
    if (
      !canClientTrackEvent(
        this.#configService.get('client.telemetry.actions'),
        CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN,
      )
    ) {
      /* If the Client can detect when the suggestion is shown in the IDE, it will notify the Server.
          Otherwise the server will assume that returned suggestions are shown and tracks the event */
      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);
    }
  }

  async #getSuggestions({
    request,
    uniqueTrackingId,
    documentContext,
    additionalContexts,
  }: {
    request: CompletionRequest;
    uniqueTrackingId: string;
    documentContext: IDocContext;
    additionalContexts?: AdditionalContext[];
  }): Promise<SuggestionOption[]> {
    const { textDocument, position, token } = request;
    const triggerKind = request.inlineCompletionContext?.triggerKind;
    log.info('Suggestion requested.');

    if (this.#circuitBreaker.isOpen()) {
      log.warn('Code suggestions were not requested as the circuit breaker is open.');
      return [];
    }

    if (!this.#configService.get('client.token')) {
      return [];
    }
    // Do not send a suggestion if content is less than 10 characters
    const contentLength =
      (documentContext?.prefix?.length || 0) + (documentContext?.suffix?.length || 0);
    if (contentLength < 10) {
      return [];
    }

    if (!isAtOrNearEndOfLine(documentContext.suffix)) {
      return [];
    }

    // Creates the suggestion and tracks suggestion_requested
    this.#tracker.setTrackingContext?.({
      uniqueTrackingId,
      context: {
        documentContext,
        triggerKind,
        additionalContexts,
      },
    });

    /** how many suggestion options should we request from the API */
    const optionsCount: OptionsCount =
      triggerKind === InlineCompletionTriggerKind.Invoked ? MANUAL_REQUEST_OPTIONS_COUNT : 1;
    const suggestionsResponse = await this.#suggestionClientPipeline.getSuggestions({
      document: documentContext,
      projectPath: this.#configService.get('client.projectPath'),
      optionsCount,
      additionalContexts,
    });

    this.#tracker.setTrackingContext?.({
      uniqueTrackingId,
      context: {
        model: suggestionsResponse?.model,
        status: suggestionsResponse?.status,
        optionsCount: suggestionsResponse?.choices?.length,
        isDirectConnection: suggestionsResponse?.isDirectConnection,
      },
    });

    if (suggestionsResponse?.error) {
      throw new Error(suggestionsResponse.error);
    }
    this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

    this.#circuitBreaker.success();

    const areSuggestionsNotProvided =
      !suggestionsResponse?.choices?.length ||
      suggestionsResponse?.choices.every(({ text }) => !text?.length);

    const suggestionOptions = (suggestionsResponse?.choices || []).map((choice, index) => ({
      ...choice,
      index,
      uniqueTrackingId,
      model: suggestionsResponse?.model,
    }));

    const processedChoices = await this.#postProcessorPipeline.run({
      documentContext,
      input: suggestionOptions,
    });

    this.#suggestionsCache.addToSuggestionCache({
      request: {
        document: textDocument,
        position,
        context: documentContext,
        additionalContexts,
      },
      suggestions: processedChoices,
    });

    if (token.isCancellationRequested) {
      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.CANCELLED, uniqueTrackingId);
      return [];
    }

    if (areSuggestionsNotProvided) {
      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED, uniqueTrackingId);
      return [];
    }

    this.#tracker.setTrackingContext?.({
      uniqueTrackingId,
      context: { suggestionOptions },
    });

    this.#trackShowIfNeeded(uniqueTrackingId);

    return processedChoices;
  }

  dispose() {
    this.#subscriptions.forEach((subscription) => subscription?.dispose());
  }

  #useAndTrackCachedSuggestions(
    textDocument: TextDocumentIdentifier,
    position: Position,
    documentContext: IDocContext,
    triggerKind?: InlineCompletionTriggerKind,
  ): SuggestionOption[] | undefined {
    const suggestionsCache = this.#suggestionsCache.getCachedSuggestions({
      document: textDocument,
      position,
      context: documentContext,
    });

    if (suggestionsCache?.options?.length) {
      const { uniqueTrackingId, model } = suggestionsCache.options[0];
      const { additionalContexts } = suggestionsCache;

      this.#tracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext,
          source: SuggestionSource.cache,
          triggerKind,
          suggestionOptions: suggestionsCache?.options,
          model,
          additionalContexts,
        },
      });

      this.#tracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);
      this.#trackShowIfNeeded(uniqueTrackingId);

      return suggestionsCache.options.map((option, index) => ({ ...option, index }));
    }

    return undefined;
  }

  async #getAdditionalContexts(documentContext: IDocContext): Promise<AdditionalContext[]> {
    let additionalContexts: AdditionalContext[] = [];

    const advancedContextEnabled = shouldUseAdvancedContext(
      this.#featureFlagService,
      this.#configService,
    );
    if (!advancedContextEnabled) {
      log.debug('[SuggestionService] code suggestion context is disabled');
      return [];
    }

    const advancedContext = await getAdvancedContext({
      documentContext,
      dependencies: {
        duoProjectAccessChecker: this.#duoProjectAccessChecker,
        supportedLanguagesService: this.#supportedLanguagesService,
      },
    });

    additionalContexts = advancedContextToRequestBody(advancedContext);
    return additionalContexts;
  }
}

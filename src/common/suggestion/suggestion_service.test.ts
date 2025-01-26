import {
  CancellationToken,
  CompletionItem,
  CompletionParams,
  InlineCompletionContext,
  InlineCompletionList,
  InlineCompletionParams,
  InlineCompletionTriggerKind,
  Position,
  Range,
} from 'vscode-languageserver';
import Parser, { Tree } from 'web-tree-sitter';
import * as AdvancedContextFactoryModule from '../advanced_context/advanced_context_factory';
import { shouldUseAdvancedContext } from '../advanced_context/helpers';
import { KhulnaSoftApiClient } from '../api';
import { CIRCUIT_BREAK_INTERVAL_MS } from '../circuit_breaker/circuit_breaker';
import { ConfigService, DefaultConfigService } from '../config_service';
import {
  START_STREAMING_COMMAND,
  SUGGESTION_ACCEPTED_COMMAND,
  SUGGESTIONS_DEBOUNCE_INTERVAL_MS,
} from '../constants';
import { DocumentTransformerService } from '../document_transformer_service';
import { FeatureFlagService } from '../feature_flags';
import { FetchError } from '../fetch_error';
import { MANUAL_REQUEST_OPTIONS_COUNT, SuggestionResponse } from '../suggestion_client';
import { DirectConnectionClient } from '../suggestion_client/direct_connection_client';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { createFakeResponse } from '../test_utils/create_fake_response';
import {
  COMPLETION_PARAMS,
  LONG_COMPLETION_CONTEXT,
  SHORT_COMPLETION_CONTEXT,
  CONTEXT_WITH_WORKSPACE_FOLDER,
} from '../test_utils/mocks';
import { CODE_SUGGESTIONS_TRACKING_EVENTS } from '../tracking/code_suggestions/constants';
import { generateUniqueTrackingId } from '../tracking/code_suggestions/utils';
import { Comment, IntentResolution, TreeSitterParser, getIntent } from '../tree_sitter';
import { DuoProjectAccessChecker } from '../services/duo_access';
import { DefaultSuggestionApiErrorCheck } from '../feature_state/suggestion_api_error_check';
import { DefaultPostProcessorPipeline } from '../suggestion_client/post_processors/default_post_processor_pipeline';
import * as VueUtils from '../utils/vue_utils';
import { ErrorHandler } from '../errors/error_handler';
import { CodeSuggestionsTelemetryTracker } from '../tracking/code_suggestions/code_suggestions_multi_tracker';
import { DuoProjectStatus } from '../services/duo_access/project_access_checker';
import { DuoProject } from '../services/duo_access/workspace_project_access_cache';
import { OpenTabAIContextItem } from '../ai_context_management/context_providers/open_tabs/open_tabs_provider';
import * as completionFilters from './suggestion_filter';
import { SuggestionsCache } from './suggestions_cache';
import { DefaultSuggestionService } from './suggestion_service';
import { StreamingHandler } from './streaming_handler';
import { SupportedLanguagesService } from './supported_languages_service';

jest.mock('./suggestions_cache');
jest.mock('./suggestion_filter');
jest.mock('./streaming_handler');
jest.mock('../tree_sitter/intent_resolver', () => ({
  getIntent: jest.fn(),
}));
jest.mock('../utils/headers_to_snowplow_options');
jest.mock('../tracking/code_suggestions/utils');

jest.useFakeTimers();
const TRACKING_ID = 'unique tracking id';
jest.mock('../open_tabs/lru_cache');
jest.mock('../advanced_context/advanced_context_factory');
jest.mock('../advanced_context/helpers');
jest.mock('../suggestion_client/direct_connection_client');
jest.mock('../tracking/code_suggestions/utils');

jest.mocked(generateUniqueTrackingId).mockReturnValue(TRACKING_ID);

interface ServiceConstructorOptions {
  configService: ConfigService;
  api: KhulnaSoftApiClient;
  documentTransformerService: DocumentTransformerService;
}

describe('DefaultSuggestionService', () => {
  let service: DefaultSuggestionService;

  let startStream = jest.fn();

  const mockParseFile = jest.fn();
  const treeSitterParser = createFakePartial<TreeSitterParser>({
    parseFile: jest.fn().mockResolvedValue({
      parserInfo: {
        languageInfo: {
          name: 'typescript',
          extensions: ['.ts'],
          wasmPath: 'some/path/to/wasm',
        },
        parser: createFakePartial<Parser>({}),
      },
      tree: createFakePartial<Tree>({}),
    }),
  });
  const documentTransformerService = createFakePartial<DocumentTransformerService>({
    getContext: jest.fn(),
    get: jest.fn(),
  });

  const codeSuggestionsTelemetryTracker = createFakePartial<CodeSuggestionsTelemetryTracker>({
    setTrackingContext: jest.fn(),
    trackEvent: jest.fn(),
  });

  const errorHandler = createFakePartial<ErrorHandler>({
    handleError: jest.fn(),
  });

  const featureFlagService = createFakePartial<FeatureFlagService>({
    isInstanceFlagEnabled: jest.fn(),
    isClientFlagEnabled: jest.fn(),
  });

  const duoProjectAccessChecker = createFakePartial<DuoProjectAccessChecker>({
    checkProjectStatus: jest.fn().mockReturnValue({
      status: DuoProjectStatus.DuoEnabled,
      project: {
        namespaceWithPath: 'path/to/project',
        uri: 'file:///path/to/project/.git/config',
        enabled: true,
      } as DuoProject,
    }),
  });
  const supportedLanguagesService = createFakePartial<SupportedLanguagesService>({});
  const postProcessorPipeline = new DefaultPostProcessorPipeline(treeSitterParser);

  const createService = (options: ServiceConstructorOptions) =>
    new DefaultSuggestionService(
      codeSuggestionsTelemetryTracker,
      options.configService,
      options.api,
      errorHandler,
      options.documentTransformerService ?? documentTransformerService,
      treeSitterParser,
      featureFlagService,
      duoProjectAccessChecker,
      supportedLanguagesService,
      new DefaultSuggestionApiErrorCheck(),
      postProcessorPipeline,
      createFakePartial<StreamingHandler>({ startStream }),
    );

  beforeEach(() => {
    jest
      .mocked(completionFilters.shouldRejectCompletionWithSelectedCompletionTextMismatch)
      .mockReturnValue(false);
    startStream = jest.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    (
      Object.keys(codeSuggestionsTelemetryTracker) as Array<keyof CodeSuggestionsTelemetryTracker>
    ).forEach((mockedMethod) => {
      (codeSuggestionsTelemetryTracker[mockedMethod] as jest.Mock).mockReset();
    });
  });

  describe('completionHandler && inlineCompletionHandler', () => {
    jest.mocked(featureFlagService.isInstanceFlagEnabled).mockReturnValue(true);

    const getAdvancedContextSpy = jest.spyOn(AdvancedContextFactoryModule, 'getAdvancedContext');

    const contextBodySpy = jest.spyOn(AdvancedContextFactoryModule, 'advancedContextToRequestBody');

    const sampleAdvancedContext = [
      {
        category: 'file',
        id: 'file://path/to/file1.ts',
        metadata: {
          languageId: 'typescript',
          title: 'file1.ts',
          enabled: true,
          subType: 'open_tab',
          icon: 'file',
          secondaryText: 'file1 content',
          subTypeLabel: 'Open Tab',
          workspaceFolder: {
            uri: 'file:///workspace',
            name: 'test-workspace',
          },
        },
      },
    ] satisfies OpenTabAIContextItem[];

    const sampleAdditionalContexts = [
      {
        content: 'somecontent',
        name: 'file1',
        type: 'file' as const,
        resolution_strategy: 'open_tabs' as const,
      },
    ];

    const sampleDuoProjectAccessChecker = {
      status: DuoProjectStatus.DuoEnabled,
      project: {
        namespaceWithPath: 'path/to/project',
        uri: 'file:///path/to/project/.git/config',
        enabled: true,
      } as DuoProject,
    };

    const isAtOrNearEndOfLineListener = jest.spyOn(completionFilters, 'isAtOrNearEndOfLine');

    isAtOrNearEndOfLineListener.mockReturnValue(true);

    const mockGetCodeSuggestions = jest.fn();

    let api = createFakePartial<KhulnaSoftApiClient>({
      getCodeSuggestions: mockGetCodeSuggestions,
      onApiReconfigured: jest.fn(),
    });

    afterEach(() => {
      mockGetCodeSuggestions.mockReset();
      getAdvancedContextSpy.mockReset();
      contextBodySpy.mockReset();
    });

    describe('completion', () => {
      const mockGetContext = jest.fn().mockReturnValue(LONG_COMPLETION_CONTEXT);
      let configService: ConfigService;
      let token: CancellationToken;

      const requestCompletionNoDebounce = (
        params: CompletionParams,
        tkn: CancellationToken,
      ): Promise<CompletionItem[]> => {
        const result = service.completionHandler(params, tkn);
        jest.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_INTERVAL_MS);
        return result;
      };

      beforeEach(async () => {
        token = createFakePartial<CancellationToken>({ isCancellationRequested: false });
        configService = new DefaultConfigService();
        configService.set('client.token', 'abc');
        api = createFakePartial<KhulnaSoftApiClient>({
          getCodeSuggestions: mockGetCodeSuggestions,
          checkToken: jest.fn().mockResolvedValue({ valid: true }),
          onApiReconfigured: jest.fn(),
        });

        const mockedDocumentTransformer = createFakePartial<DocumentTransformerService>({
          getContext: mockGetContext,
        });

        jest
          .mocked(getIntent)
          .mockResolvedValue(createFakePartial<IntentResolution>({ intent: 'completion' }));

        service = createService({
          api,
          configService,
          documentTransformerService: mockedDocumentTransformer,
        });
      });

      it('sends a suggestion when all setup is present', async () => {
        mockGetCodeSuggestions.mockReturnValueOnce({
          choices: [{ text: 'mock suggestion' }],
          model: {
            lang: 'js',
          },
        });

        const result = await requestCompletionNoDebounce(COMPLETION_PARAMS, token);
        expect(result.length).toEqual(1);
        const [suggestedItem] = result;
        expect(suggestedItem.insertText).toBe('mock suggestion');
        expect(suggestedItem.command).toEqual({
          title: expect.any(String),
          command: SUGGESTION_ACCEPTED_COMMAND,
          arguments: [TRACKING_ID],
        });
      });

      it('requests completion including projectPath from workspace settings', async () => {
        configService.set('client.projectPath', 'gitlab-org/gitlab-vscode-extension');
        await requestCompletionNoDebounce(COMPLETION_PARAMS, token);
        expect(api.getCodeSuggestions).toHaveBeenCalledWith(
          expect.objectContaining({ project_path: 'gitlab-org/gitlab-vscode-extension' }),
        );
      });

      it('does not send a suggestion when context is short', async () => {
        mockGetContext.mockReturnValueOnce(SHORT_COMPLETION_CONTEXT);

        const result = await requestCompletionNoDebounce(COMPLETION_PARAMS, token);

        expect(result).toEqual([]);
      });

      it('does not send a suggestion when in middle of line', async () => {
        isAtOrNearEndOfLineListener.mockReturnValueOnce(false);

        const result = await requestCompletionNoDebounce(COMPLETION_PARAMS, token);

        expect(result).toEqual([]);
      });

      describe('Suggestions not provided', () => {
        it('should track suggestion not provided when no choices returned', async () => {
          mockGetCodeSuggestions.mockReturnValueOnce(() => ({
            choices: [],
            model: {
              lang: 'js',
            },
          }));

          const result = await requestCompletionNoDebounce(COMPLETION_PARAMS, token);
          expect(jest.mocked(codeSuggestionsTelemetryTracker.trackEvent)).toHaveBeenCalledWith(
            CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED,
            TRACKING_ID,
          );
          expect(result).toEqual([]);
        });

        it('should track suggestion not provided when every choice is empty', async () => {
          mockGetCodeSuggestions.mockReturnValueOnce(() => ({
            choices: [{ text: '' }, { text: undefined }],
            model: {
              lang: 'js',
            },
          }));

          const result = await requestCompletionNoDebounce(COMPLETION_PARAMS, token);
          expect(jest.mocked(codeSuggestionsTelemetryTracker.trackEvent)).toHaveBeenCalledWith(
            CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED,
            TRACKING_ID,
          );
          expect(result).toEqual([]);
        });
      });

      describe('Suggestions error', () => {
        const errorStatusCode = 400;

        const response = createFakeResponse({
          url: 'https://example.com/api/v4/project',
          status: errorStatusCode,
          text: 'Bad Request',
        });

        it('should update code suggestion context with error status', async () => {
          mockGetCodeSuggestions.mockRejectedValueOnce(new FetchError(response, 'completion'));

          await requestCompletionNoDebounce(COMPLETION_PARAMS, token);

          expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
            uniqueTrackingId: TRACKING_ID,
            context: {
              status: errorStatusCode,
            },
          });

          expect(errorHandler.handleError).toHaveBeenCalled();
        });
      });

      describe('Circuit breaking', () => {
        const getCompletions = async () => {
          const result = await requestCompletionNoDebounce(COMPLETION_PARAMS, token);
          return result;
        };
        const turnOnCircuitBreaker = async () => {
          await getCompletions();
          await getCompletions();
          await getCompletions();
          await getCompletions();
        };

        it('starts breaking after 4 errors', async () => {
          mockGetCodeSuggestions.mockResolvedValue({
            choices: [{ text: 'mock suggestion' }],
            model: {
              lang: 'js',
            },
          });
          const successResult = await getCompletions();
          expect(successResult.length).toEqual(1);
          mockGetCodeSuggestions.mockRejectedValue(new Error('test problem'));
          await turnOnCircuitBreaker();

          mockGetCodeSuggestions.mockReset();
          mockGetCodeSuggestions.mockResolvedValue({
            choices: [{ text: 'mock suggestion' }],
            model: {
              lang: 'js',
            },
          });

          const result = await getCompletions();
          expect(result).toEqual([]);
          expect(mockGetCodeSuggestions).not.toHaveBeenCalled();
          expect(errorHandler.handleError).toHaveBeenCalled();
        });

        it(`fetches completions again after circuit breaker's break time elapses`, async () => {
          jest.useFakeTimers().setSystemTime(new Date(Date.now()));

          mockGetCodeSuggestions.mockRejectedValue(new Error('test problem'));
          await turnOnCircuitBreaker();

          mockGetCodeSuggestions.mockReset();
          mockGetCodeSuggestions.mockResolvedValue({
            choices: [{ text: 'mock suggestion' }],
            model: {
              lang: 'js',
            },
          });
          jest.advanceTimersByTime(CIRCUIT_BREAK_INTERVAL_MS + 1);

          const result = await getCompletions();

          expect(result).toHaveLength(1);
          expect(mockGetCodeSuggestions).toHaveBeenCalled();
        });
      });

      describe('Debouncing', () => {
        beforeEach(() => {
          mockGetCodeSuggestions.mockResolvedValue({
            choices: [{ text: 'mock suggestion' }],
            model: {
              lang: 'js',
            },
          });
        });

        it('returns empty result if token was cancelled before debounce interval', async () => {
          const testToken = { isCancellationRequested: false };

          const completionPromise = service.completionHandler(
            COMPLETION_PARAMS,
            testToken as CancellationToken,
          );
          testToken.isCancellationRequested = true;
          jest.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_INTERVAL_MS);

          const result = await completionPromise;
          expect(result).toEqual([]);
        });

        it('continues to call API if token has not been cancelled before debounce interval', async () => {
          const testToken = { isCancellationRequested: false };
          const completionPromise = service.completionHandler(
            COMPLETION_PARAMS,
            testToken as CancellationToken,
          );
          jest.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_INTERVAL_MS);

          const result = await completionPromise;
          expect(result.length).toEqual(1);
        });
      });

      describe('Additional Context', () => {
        beforeEach(async () => {
          jest.mocked(shouldUseAdvancedContext).mockReturnValueOnce(true);
          getAdvancedContextSpy.mockResolvedValue(sampleAdvancedContext);
          contextBodySpy.mockReturnValue(sampleAdditionalContexts);

          await requestCompletionNoDebounce(COMPLETION_PARAMS, token);
        });

        it('"getCodeSuggestions" should have additional context passed when feature is enabled', async () => {
          expect(getAdvancedContextSpy).toHaveBeenCalled();
          expect(contextBodySpy).toHaveBeenCalledWith(sampleAdvancedContext);
          expect(api.getCodeSuggestions).toHaveBeenCalledWith(
            expect.objectContaining({ context: sampleAdditionalContexts }),
          );
        });

        it('should be tracked with telemetry', () => {
          expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
            uniqueTrackingId: TRACKING_ID,
            context: expect.objectContaining({ additionalContexts: sampleAdditionalContexts }),
          });
        });
      });
    });

    describe('inlineCompletion', () => {
      const mockGetContext = jest.fn().mockReturnValue(LONG_COMPLETION_CONTEXT);
      let configService: ConfigService;

      const inlineCompletionParams: InlineCompletionParams = {
        ...COMPLETION_PARAMS,
        position: Position.create(1, 1),
        context: {
          triggerKind: InlineCompletionTriggerKind.Automatic,
        },
      };

      const requestInlineCompletionNoDebounce = (
        params: InlineCompletionParams,
        tkn: CancellationToken,
      ): Promise<InlineCompletionList> => {
        const result = service.inlineCompletionHandler(params, tkn);
        jest.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_INTERVAL_MS);
        return result;
      };
      let token: CancellationToken;
      let directConnectionClient: DirectConnectionClient;

      beforeEach(async () => {
        token = createFakePartial<CancellationToken>({ isCancellationRequested: false });
        configService = new DefaultConfigService();
        configService.set('client.token', 'abc');
        directConnectionClient = createFakePartial<DirectConnectionClient>({
          getSuggestions: jest.fn(),
        });
        jest.mocked(DirectConnectionClient).mockReturnValue(directConnectionClient);

        const mockedDocumentTransformer = createFakePartial<DocumentTransformerService>({
          getContext: mockGetContext,
          get: jest.fn(),
        });

        jest
          .mocked(getIntent)
          .mockResolvedValue(createFakePartial<IntentResolution>({ intent: 'generation' }));

        service = createService({
          api,
          configService,
          documentTransformerService: mockedDocumentTransformer,
        });
      });

      describe('Streaming', () => {
        beforeEach(async () => {
          startStream.mockResolvedValue([]);
          jest.mocked(featureFlagService.isClientFlagEnabled).mockReturnValue(true);
          mockParseFile.mockResolvedValueOnce('generation');
        });

        afterEach(() => {
          jest.mocked(featureFlagService.isClientFlagEnabled).mockReset();
        });

        it('should return empty response when suggestion was cancelled', async () => {
          const cancellationToken = { isCancellationRequested: false };
          const promise = requestInlineCompletionNoDebounce(
            inlineCompletionParams,
            cancellationToken as CancellationToken,
          );
          cancellationToken.isCancellationRequested = true;
          const response = await promise;

          expect(response.items).toEqual([]);
        });

        it('does not request completion suggestions', async () => {
          await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          expect(mockGetCodeSuggestions).not.toHaveBeenCalled();
        });

        it('should return empty response with streaming command', async () => {
          const response = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          expect(response.items[0]).toMatchObject({
            insertText: '',
            command: {
              title: 'Start streaming',
              command: START_STREAMING_COMMAND,
              arguments: [expect.stringContaining('code-suggestion-stream-'), TRACKING_ID],
            },
          });
        });

        it('should start the stream', async () => {
          mockGetContext.mockReturnValueOnce(CONTEXT_WITH_WORKSPACE_FOLDER);

          await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          jest.runOnlyPendingTimers();

          expect(startStream).toHaveBeenCalledWith({
            streamId: expect.stringContaining('code-suggestion-stream-'),
            documentContext: CONTEXT_WITH_WORKSPACE_FOLDER,
            uniqueTrackingId: TRACKING_ID,
            additionalContexts: [],
            userInstruction: undefined,
            generationType: undefined,
            contextProjectPath: sampleDuoProjectAccessChecker.project.namespaceWithPath,
          });
        });

        it('should have additional context passed if feature is enabled', async () => {
          mockGetContext.mockReturnValueOnce(CONTEXT_WITH_WORKSPACE_FOLDER);

          jest.mocked(shouldUseAdvancedContext).mockReturnValueOnce(true);
          getAdvancedContextSpy.mockResolvedValue(sampleAdvancedContext);
          contextBodySpy.mockReturnValue(sampleAdditionalContexts);

          await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          jest.runOnlyPendingTimers();

          expect(getAdvancedContextSpy).toHaveBeenCalled();
          expect(contextBodySpy).toHaveBeenCalledWith(sampleAdvancedContext);

          expect(startStream).toHaveBeenCalledWith({
            streamId: expect.stringContaining('code-suggestion-stream-'),
            documentContext: CONTEXT_WITH_WORKSPACE_FOLDER,
            uniqueTrackingId: TRACKING_ID,
            additionalContexts: sampleAdditionalContexts,
            userInstruction: undefined,
            generationType: undefined,
            contextProjectPath: sampleDuoProjectAccessChecker.project.namespaceWithPath,
          });
        });

        it('should include generation type and user instruction', async () => {
          const generationType = 'comment';
          const userInstruction = 'somecontent';
          jest.mocked(getIntent).mockResolvedValueOnce({
            intent: 'generation',
            generationType,
            commentForCursor: createFakePartial<Comment>({
              content: userInstruction,
            }),
          });

          await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          jest.runOnlyPendingTimers();

          expect(startStream).toHaveBeenCalledWith(
            expect.objectContaining({ userInstruction, generationType }),
          );
        });
      });

      describe('when inline completion context does not match selected document text', () => {
        beforeEach(() => {
          jest
            .mocked(completionFilters.shouldRejectCompletionWithSelectedCompletionTextMismatch)
            .mockReset()
            .mockReturnValueOnce(true);
        });

        it('does not request suggestions', async () => {
          const { items } = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

          expect(mockGetCodeSuggestions).not.toHaveBeenCalled();
          expect(items).toHaveLength(0);
        });
      });

      it('sends a suggestion when all setup is present', async () => {
        mockGetCodeSuggestions.mockReturnValueOnce({
          choices: [{ text: 'mock suggestion' }],
          model: {
            lang: 'js',
          },
        });

        const { items } = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        expect(items.length).toEqual(1);
        const [suggestedItem] = items;
        expect(suggestedItem.insertText).toBe('mock suggestion');
        expect(suggestedItem.command).toEqual({
          title: expect.any(String),
          command: SUGGESTION_ACCEPTED_COMMAND,
          arguments: [TRACKING_ID, 1],
        });
        expect(suggestedItem.range).toEqual(
          Range.create(Position.create(1, 1), Position.create(1, 1)),
        );
      });

      it('requests inline completion including projectPath from workspace settings', async () => {
        configService.set('client.projectPath', 'gitlab-org/editor-extensions/gitlab.vim');
        await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
        expect(api.getCodeSuggestions).toHaveBeenCalledWith(
          expect.objectContaining({ project_path: 'gitlab-org/editor-extensions/gitlab.vim' }),
        );
      });

      it('sets cache on successful request', async () => {
        mockGetCodeSuggestions.mockReturnValueOnce({
          choices: [{ text: 'mock suggestion' }],
          model: {
            lang: 'js',
          },
        });

        const cacheMock = jest.mocked(jest.mocked(SuggestionsCache).mock.instances.at(-1)!);

        const { items } = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        const [cacheArgs] = jest.mocked(cacheMock.addToSuggestionCache).mock.calls.at(-1)!;
        expect(cacheArgs.suggestions[0]?.uniqueTrackingId).toBe(TRACKING_ID);
        expect(cacheArgs.suggestions.map((s) => s.text)).toEqual(items.map((i) => i.insertText));
        expect(cacheArgs.request.position).toEqual(inlineCompletionParams.position);
      });

      it('does not send request when data is available in cache', async () => {
        const cacheMock = jest.mocked(jest.mocked(SuggestionsCache).mock.instances.at(-1)!);

        cacheMock.getCachedSuggestions.mockReturnValueOnce({
          options: [{ text: 'cached suggestion', uniqueTrackingId: 'cached id' }],
        });

        const { items } = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        expect(cacheMock.getCachedSuggestions).toHaveBeenCalledTimes(1);
        expect(mockGetCodeSuggestions).toHaveBeenCalledTimes(0);
        expect(items.length).toEqual(1);
        const [suggestedItem] = items;
        expect(suggestedItem.insertText).toBe('cached suggestion');
        expect(suggestedItem.command).toEqual({
          title: expect.any(String),
          command: SUGGESTION_ACCEPTED_COMMAND,
          arguments: ['cached id', 1],
        });
        expect(suggestedItem.range).toEqual(
          Range.create(Position.create(1, 1), Position.create(1, 1)),
        );
      });

      describe('trigger kind', () => {
        const invokedTriggerParams: InlineCompletionParams = {
          ...inlineCompletionParams,
          context: {
            ...inlineCompletionParams.context,
            triggerKind: InlineCompletionTriggerKind.Invoked,
          },
        };

        describe('when "Invoked"', () => {
          it('uses cache AND API', async () => {
            const cacheMock = jest.mocked(jest.mocked(SuggestionsCache).mock.instances.at(-1)!);

            await requestInlineCompletionNoDebounce(invokedTriggerParams, token);

            expect(cacheMock.getCachedSuggestions).toHaveBeenCalledTimes(1);
            expect(mockGetCodeSuggestions).toHaveBeenCalledTimes(1);
          });

          it('prepends cached options to API options', async () => {
            const cacheMock = jest.mocked(jest.mocked(SuggestionsCache).mock.instances.at(-1)!);

            const cachedSuggestionUniqueId = 'cached id';
            cacheMock.getCachedSuggestions.mockReturnValueOnce({
              options: [{ text: 'cached suggestion', uniqueTrackingId: cachedSuggestionUniqueId }],
            });
            mockGetCodeSuggestions.mockReturnValueOnce({
              choices: [{ text: 'api suggestion' }],
              model: {
                lang: 'js',
              },
            });

            const { items } = await requestInlineCompletionNoDebounce(invokedTriggerParams, token);

            expect(items).toEqual([
              expect.objectContaining({ insertText: 'cached suggestion' }),
              expect.objectContaining({ insertText: 'api suggestion' }),
            ]);
          });

          it('asks for multiple options', async () => {
            await requestInlineCompletionNoDebounce(invokedTriggerParams, token);

            expect(mockGetCodeSuggestions).toHaveBeenCalledWith(
              expect.objectContaining({ choices_count: MANUAL_REQUEST_OPTIONS_COUNT }),
            );
          });

          it('tracks "triggerKind=Invoked"', async () => {
            await requestInlineCompletionNoDebounce(invokedTriggerParams, token);

            expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
              uniqueTrackingId: TRACKING_ID,
              context: expect.objectContaining({
                triggerKind: InlineCompletionTriggerKind.Invoked,
              }),
            });
          });
        });

        describe('when "Automatic"', () => {
          it('tracks "triggerKind=Automatic"', async () => {
            await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
            expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
              uniqueTrackingId: TRACKING_ID,
              context: expect.objectContaining({
                triggerKind: InlineCompletionTriggerKind.Automatic,
              }),
            });
          });
        });
      });

      it('tracks a number of returned options for the completion request as "optionsCount"', async () => {
        mockGetCodeSuggestions.mockReturnValueOnce(
          createFakePartial<SuggestionResponse>({
            choices: [{ text: 'mock suggestion' }, { text: 'mock suggestion 2' }],
          }),
        );
        const response = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
          uniqueTrackingId: TRACKING_ID,
          context: expect.objectContaining({ optionsCount: response.items.length }),
        });
      });

      it('tracks whether the suggestion request went directly to AI Gateway', async () => {
        jest.mocked(directConnectionClient.getSuggestions).mockResolvedValue(
          createFakePartial<SuggestionResponse>({
            choices: [{ text: 'mock suggestion' }],
            isDirectConnection: true,
          }),
        );
        await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
          uniqueTrackingId: TRACKING_ID,
          context: expect.objectContaining({ isDirectConnection: true }),
        });
      });

      it('tracks cached entries with full telemetry', async () => {
        const cacheMock = jest.mocked(jest.mocked(SuggestionsCache).mock.instances.at(-1)!);

        cacheMock.getCachedSuggestions.mockReturnValueOnce({
          options: [
            {
              text: 'cached suggestion',
              uniqueTrackingId: 'cached id',
              model: { engine: 'engine', lang: 'javascript', name: 'name' },
            },
          ],
        });

        await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
          uniqueTrackingId: 'cached id',
          context: {
            documentContext: expect.any(Object),
            source: 'cache',
            triggerKind: InlineCompletionTriggerKind.Automatic,
            model: {
              lang: 'javascript',
              engine: 'engine',
              name: 'name',
            },
            suggestionOptions: expect.any(Array),
          },
        });
        expect(jest.mocked(codeSuggestionsTelemetryTracker.trackEvent).mock.calls).toEqual([
          [CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, 'cached id'],
          [CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, 'cached id'],
        ]);
      });

      it('does not send a suggestion when context is short', async () => {
        mockGetContext.mockReturnValueOnce(SHORT_COMPLETION_CONTEXT);

        const { items } = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        expect(items).toEqual([]);
      });

      it('does not send a suggestion when in middle of line', async () => {
        isAtOrNearEndOfLineListener.mockReturnValueOnce(false);

        const { items } = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

        expect(items).toEqual([]);
      });

      it('tracks suggestion cancelled if the suggestion request has been cancelled before API responded', async () => {
        const testToken = { isCancellationRequested: false };

        mockGetCodeSuggestions.mockImplementation(async () => {
          // simulate that request has been cancelled before API responded
          testToken.isCancellationRequested = true;
          return {
            choices: [{ text: 'mock suggestion' }],
            model: {
              lang: 'js',
            },
          };
        });

        const { items } = await requestInlineCompletionNoDebounce(
          inlineCompletionParams,
          testToken as CancellationToken,
        );

        expect(items).toEqual([]);
        expect(jest.mocked(codeSuggestionsTelemetryTracker.trackEvent)).toHaveBeenCalledWith(
          CODE_SUGGESTIONS_TRACKING_EVENTS.CANCELLED,
          TRACKING_ID,
        );
      });

      describe('Suggestions not provided', () => {
        it('should track suggestion not provided when no choices returned', async () => {
          mockGetCodeSuggestions.mockReturnValueOnce(() => ({
            choices: [],
            model: {
              lang: 'js',
            },
          }));

          const result = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          expect(jest.mocked(codeSuggestionsTelemetryTracker.trackEvent)).toHaveBeenCalledWith(
            CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED,
            TRACKING_ID,
          );
          expect(result.items).toEqual([]);
        });

        it('should track suggestion not provided when every choice is empty', async () => {
          mockGetCodeSuggestions.mockReturnValueOnce(() => ({
            choices: [{ text: '' }, { text: undefined }],
            model: {
              lang: 'js',
            },
          }));

          const result = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          expect(jest.mocked(codeSuggestionsTelemetryTracker.trackEvent)).toHaveBeenCalledWith(
            CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED,
            TRACKING_ID,
          );
          expect(result.items).toEqual([]);
        });
      });

      describe('Suggestions error', () => {
        const errorStatusCode = 400;

        const response = createFakeResponse({
          url: 'https://example.com/api/v4/project',
          status: errorStatusCode,
          text: 'Bad Request',
        });

        it('should update code suggestion context with error status', async () => {
          mockGetCodeSuggestions.mockRejectedValueOnce(new FetchError(response, 'completion'));

          await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

          expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
            uniqueTrackingId: TRACKING_ID,
            context: {
              status: errorStatusCode,
            },
          });
        });
      });

      describe('Circuit breaking', () => {
        const getCompletions = async () => {
          const result = await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
          return result;
        };
        const turnOnCircuitBreaker = async () => {
          await getCompletions();
          await getCompletions();
          await getCompletions();
          await getCompletions();
        };

        describe('Completion', () => {
          it('starts breaking after 4 errors', async () => {
            mockGetCodeSuggestions.mockReset();
            mockGetCodeSuggestions.mockResolvedValue({
              choices: [{ text: 'mock suggestion' }],
              model: {
                lang: 'js',
              },
            });
            const successResult = await getCompletions();
            expect(successResult.items.length).toEqual(1);
            mockGetCodeSuggestions.mockRejectedValue(new Error('test problem'));
            await turnOnCircuitBreaker();

            mockGetCodeSuggestions.mockReset();
            mockGetCodeSuggestions.mockResolvedValue({
              choices: [{ text: 'mock suggestion' }],
              model: {
                lang: 'js',
              },
            });

            const result = await getCompletions();
            expect(result?.items).toEqual([]);
            expect(mockGetCodeSuggestions).not.toHaveBeenCalled();
          });

          it(`fetches completions again after circuit breaker's break time elapses`, async () => {
            jest.useFakeTimers().setSystemTime(new Date(Date.now()));

            mockGetCodeSuggestions.mockRejectedValue(new Error('test problem'));
            await turnOnCircuitBreaker();

            mockGetCodeSuggestions.mockReset();
            mockGetCodeSuggestions.mockResolvedValue({
              choices: [{ text: 'mock suggestion' }],
              model: {
                lang: 'js',
              },
            });
            jest.advanceTimersByTime(CIRCUIT_BREAK_INTERVAL_MS + 1);

            const result = await getCompletions();

            expect(result?.items).toHaveLength(1);
            expect(mockGetCodeSuggestions).toHaveBeenCalled();
          });
        });

        describe('Streaming', () => {
          function goIntoStreamingMode() {
            mockParseFile.mockReset();
            jest.mocked(featureFlagService.isClientFlagEnabled).mockReturnValueOnce(true);
            mockParseFile.mockResolvedValue('generation');
          }

          function goIntoCompletionMode() {
            mockParseFile.mockReset();
            jest.mocked(featureFlagService.isClientFlagEnabled).mockReturnValueOnce(false);
            mockParseFile.mockResolvedValue('completion');
          }

          it('starts breaking after 4 errors', async () => {
            goIntoStreamingMode();
            const successResult = await getCompletions();
            expect(successResult.items.length).toEqual(1);
            jest.runOnlyPendingTimers();
            goIntoCompletionMode();

            mockGetCodeSuggestions.mockRejectedValue('test problem');
            await turnOnCircuitBreaker();

            goIntoStreamingMode();

            const result = await getCompletions();
            expect(result?.items).toEqual([]);
          });

          it(`starts the stream after circuit breaker's break time elapses`, async () => {
            jest.useFakeTimers().setSystemTime(new Date(Date.now()));

            goIntoCompletionMode();
            mockGetCodeSuggestions.mockRejectedValue(new Error('test problem'));
            await turnOnCircuitBreaker();

            jest.advanceTimersByTime(CIRCUIT_BREAK_INTERVAL_MS + 1);
            goIntoStreamingMode();
            const result = await getCompletions();
            expect(result?.items).toHaveLength(1);
            jest.runOnlyPendingTimers();
          });
        });
      });

      describe('selection completion info', () => {
        beforeEach(() => {
          mockGetCodeSuggestions.mockReset();
          mockGetCodeSuggestions.mockResolvedValue({
            choices: [{ text: 'log("Hello world")' }],
            model: {
              lang: 'js',
            },
          });
        });

        describe('when undefined', () => {
          it('does not update choices', async () => {
            const { items } = await requestInlineCompletionNoDebounce(
              {
                ...inlineCompletionParams,
                context: createFakePartial<InlineCompletionContext>({
                  selectedCompletionInfo: undefined,
                }),
              },
              token,
            );

            expect(items[0].insertText).toBe('log("Hello world")');
          });
        });

        describe('with range and text', () => {
          it('prepends text to suggestion choices', async () => {
            const { items } = await requestInlineCompletionNoDebounce(
              {
                ...inlineCompletionParams,
                context: createFakePartial<InlineCompletionContext>({
                  selectedCompletionInfo: {
                    text: 'console.',
                    range: { start: { line: 1, character: 0 }, end: { line: 1, character: 2 } },
                  },
                }),
              },
              token,
            );

            expect(items[0].insertText).toBe('nsole.log("Hello world")');
          });
        });

        describe('with range (Array) and text', () => {
          it('prepends text to suggestion choices', async () => {
            const { items } = await requestInlineCompletionNoDebounce(
              {
                ...inlineCompletionParams,
                context: createFakePartial<InlineCompletionContext>({
                  selectedCompletionInfo: {
                    text: 'console.',
                    // NOTE: This forcefully simulates the behavior we see where range is an Array at runtime.
                    range: [
                      { line: 1, character: 0 },
                      { line: 1, character: 2 },
                    ] as unknown as Range,
                  },
                }),
              },
              token,
            );

            expect(items[0].insertText).toBe('nsole.log("Hello world")');
          });
        });
      });

      describe('Additional Context', () => {
        beforeEach(async () => {
          jest.mocked(shouldUseAdvancedContext).mockReturnValueOnce(true);
          getAdvancedContextSpy.mockResolvedValue(sampleAdvancedContext);
          contextBodySpy.mockReturnValue(sampleAdditionalContexts);

          await requestInlineCompletionNoDebounce(inlineCompletionParams, token);
        });

        it('getCodeSuggestions should have additional context passed if feature is enabled', async () => {
          expect(getAdvancedContextSpy).toHaveBeenCalled();
          expect(contextBodySpy).toHaveBeenCalledWith(sampleAdvancedContext);
          expect(api.getCodeSuggestions).toHaveBeenCalledWith(
            expect.objectContaining({ context: sampleAdditionalContexts }),
          );
        });

        it('should be tracked with telemetry', () => {
          expect(codeSuggestionsTelemetryTracker.setTrackingContext).toHaveBeenCalledWith({
            uniqueTrackingId: TRACKING_ID,
            context: expect.objectContaining({ additionalContexts: sampleAdditionalContexts }),
          });
        });
      });

      describe('Vue file handling', () => {
        const scriptContent = 'function test() { return true; }';
        const prefix = '<template>\n  <h1>Hello!</h1>\n</template>\n\n<script>\n';
        const suffix = `${scriptContent}\n</script>`;

        beforeEach(() => {
          mockGetContext.mockReturnValue({
            ...LONG_COMPLETION_CONTEXT,
            languageId: 'vue',
            prefix,
            suffix,
          });

          jest.spyOn(VueUtils, 'extractScript').mockReturnValue({
            scriptContent,
            scriptStartCharacter: 42,
            scriptStartLine: 4,
            language: 'js',
          });
        });

        it('calls getIntent with correct parameters for Vue files', async () => {
          await requestInlineCompletionNoDebounce(inlineCompletionParams, token);

          expect(getIntent).toHaveBeenCalledWith({
            treeAndLanguage: expect.anything(),
            position: {
              line: 0,
              character: 7,
            },
            prefix,
            suffix,
          });
        });
      });
    });
  });
});

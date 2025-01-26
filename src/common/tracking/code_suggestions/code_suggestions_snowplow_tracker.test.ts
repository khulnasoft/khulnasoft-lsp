import { InlineCompletionTriggerKind } from 'vscode-languageserver';
import { TestLogger } from '@khulnasoft/logging';
import {
  IDocContext,
  DefaultConfigService,
  ConfigService,
  KhulnaSoftApiClient,
  SUGGESTIONS_DEBOUNCE_INTERVAL_MS,
} from '../..';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { shouldUseAdvancedContext } from '../../advanced_context/helpers';
import { FeatureFlagService } from '../../feature_flags';
import { AdditionalContext } from '../../api_types';
import { getByteSize } from '../../utils/byte_size';
import { DefaultSupportedLanguagesService } from '../../suggestion/supported_languages_service';
import { SnowplowService } from '../snowplow/snowplow_service';
import { IClientContext } from '../snowplow/constants';
import {
  CODE_SUGGESTIONS_TRACKING_EVENTS,
  TELEMETRY_DISABLED_WARNING_MSG,
  TELEMETRY_ENABLED_MSG,
} from './constants';
import {
  ICodeSuggestionModel,
  SuggestionSource,
  GitlabRealm,
} from './code_suggestions_tracking_types';
import {
  CodeSuggestionsSnowplowTracker,
  DefaultCodeSuggestionsSnowplowTracker,
} from './code_suggestions_snowplow_tracker';
import { generateUniqueTrackingId } from './utils';

const mockLanguage = 'typescript';

jest.mock('../../advanced_context/helpers');
jest.mock('../../suggestion/supported_languages_service');
jest.mocked(DefaultSupportedLanguagesService.getLanguageForFile).mockReturnValue(mockLanguage);

jest.useFakeTimers();
jest.mock('../ls_info.json', () => ({ version: '1-0-0' }));

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

describe('CodeSuggestionsSnowplowTracker', () => {
  let snowplowTracker: CodeSuggestionsSnowplowTracker;
  const mockInstanceId = '1';
  const mockGlobalUserId = '2';
  const mockHostName = 'https://test.gitlab.com';
  const mockDuoProNamespaceIds = [3, 4, 5];
  let configService: ConfigService;
  let featureFlagsService: FeatureFlagService;
  const instanceVersion = '17.3.0';
  let apiClient: KhulnaSoftApiClient;
  const logger = new TestLogger();
  jest.spyOn(logger, 'warn');
  jest.spyOn(logger, 'info');

  const mockTrackStructEvent = jest.fn();
  const mockSchemaValidate = jest.fn();

  const snowplowService = createFakePartial<SnowplowService>({
    trackStructuredEvent: mockTrackStructEvent,
    validateContext: mockSchemaValidate,
  });

  const mockAdditionalContexts = [createFakePartial<AdditionalContext>({ name: 'file.ts' })];
  const uniqueTrackingId = generateUniqueTrackingId();

  beforeEach(() => {
    configService = new DefaultConfigService();
    featureFlagsService = createFakePartial<FeatureFlagService>({});
    apiClient = createFakePartial<KhulnaSoftApiClient>({
      instanceInfo: {
        instanceUrl: 'https://example.com',
        instanceVersion,
      },
    });

    snowplowTracker = new DefaultCodeSuggestionsSnowplowTracker(
      configService,
      featureFlagsService,
      apiClient,
      snowplowService,
      logger,
    );
    mockSchemaValidate.mockReturnValue(true);
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  describe('Reconfigure', () => {
    it('telemetry should be enabled by default', () => {
      expect(snowplowTracker.isEnabled()).toBe(true);
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

    it('should be able to toggle telemetry', () => {
      configService.set('client.telemetry.enabled', false);
      expect(snowplowTracker.isEnabled()).toBe(false);

      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId: '1',
        context: {
          documentContext: mockDocumentContext,
        },
      });
      expect(mockTrackStructEvent).not.toHaveBeenCalled();
      configService.set('client.telemetry.enabled', true);
      expect(snowplowTracker.isEnabled()).toBe(true);
      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId: '2',
        context: {
          documentContext: mockDocumentContext,
        },
      });
      expect(mockTrackStructEvent).toHaveBeenCalled();
    });

    it('should update `baseUrl` if provided but not the `enabled`', () => {
      expect(snowplowTracker.isEnabled()).toBe(true);
      configService.set('client.telemetry.baseUrl', false);
      expect(snowplowTracker.isEnabled()).toBe(true);
    });
  });

  describe('Events', () => {
    const setRequestedState = () => {
      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });
    };

    const setLoadedState = () => {
      setRequestedState();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);
    };

    const setShownState = () => {
      setLoadedState();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);
    };

    const setErroredState = () => {
      setRequestedState();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED, uniqueTrackingId);
    };

    const setCancelledState = () => {
      setLoadedState();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.CANCELLED, uniqueTrackingId);
    };

    const setNotProvidedState = () => {
      setLoadedState();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED, uniqueTrackingId);
    };

    const setRejectedState = () => {
      setShownState();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId);
    };

    const setAcceptedState = () => {
      setShownState();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED, uniqueTrackingId);
    };

    const stateFactories: Array<[CODE_SUGGESTIONS_TRACKING_EVENTS, () => void]> = [
      [CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED, setRequestedState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, setLoadedState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, setShownState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED, setErroredState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.CANCELLED, setCancelledState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.NOT_PROVIDED, setNotProvidedState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, setRejectedState],
      [CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED, setAcceptedState],
    ];

    it.each(stateFactories)('should track the %s event', (eventType, stateFactory) => {
      stateFactory();

      snowplowTracker.trackEvent(eventType, uniqueTrackingId);
      expect(mockTrackStructEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: eventType }),
        expect.arrayContaining([
          expect.objectContaining({ schema: expect.any(String), data: expect.any(Object) }),
        ]),
      );
    });
  });

  describe('Tracking contexts', () => {
    describe('Client context', () => {
      it('should track event with ide and extension data', () => {
        const clientContext: IClientContext = {
          ide: { name: 'IDE', version: '1.0', vendor: 'Vendor' },
          extension: { name: 'Updated Extension', version: '2.0' },
        };

        configService.set('client.telemetry', { enabled: true, ...clientContext });

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
          },
        });
        expect(mockTrackStructEvent.mock.calls[0]).toEqual([
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
          expect.arrayContaining([
            expect.objectContaining({
              schema: 'iglu:com.gitlab/ide_extension_version/jsonschema/1-1-0',
              data: {
                ide_name: 'IDE',
                ide_version: '1.0',
                ide_vendor: 'Vendor',
                extension_name: 'Updated Extension',
                extension_version: '2.0',
                language_server_version: '1-0-0',
              },
            }),
          ]),
        ]);
      });
    });

    describe('Code suggestions context', () => {
      it('should track event with document context data', () => {
        configService.set('client.snowplowTrackerOptions', {
          gitlab_instance_id: mockInstanceId,
          gitlab_global_user_id: mockGlobalUserId,
          gitlab_host_name: mockHostName,
          gitlab_saas_duo_pro_namespace_ids: mockDuoProNamespaceIds,
        });

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
          },
        });

        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
          [
            expect.any(Object),
            {
              schema: 'iglu:com.gitlab/code_suggestions_context/jsonschema/3-5-0',
              data: {
                suffix_length: 11,
                prefix_length: 12,
                gitlab_realm: GitlabRealm.saas,
                language: mockLanguage,
                model_name: null,
                model_engine: null,
                api_status_code: null,
                debounce_interval: SUGGESTIONS_DEBOUNCE_INTERVAL_MS,
                suggestion_source: 'network',
                gitlab_global_user_id: mockGlobalUserId,
                gitlab_instance_id: mockInstanceId,
                gitlab_host_name: mockHostName,
                gitlab_saas_duo_pro_namespace_ids: mockDuoProNamespaceIds,
                gitlab_instance_version: instanceVersion,
                is_streaming: false,
                is_invoked: null,
                options_count: null,
                has_advanced_context: null,
                is_direct_connection: null,
                content_above_cursor_size_bytes: 12,
                content_below_cursor_size_bytes: 11,
                total_context_size_bytes: 0,
                context_items: null,
              },
            },
          ],
        );
      });

      describe('model options', () => {
        it.each([
          [{ engine: 'Engine' }, { model_engine: 'Engine' }],
          [{ name: 'Model' }, { model_name: 'Model' }],
          [{ lang: 'javascript' }, { language: 'javascript' }],
          [{}, {}],
          [undefined, {}],
        ])('should track event with model data for %s', (model, expectedResult) => {
          snowplowTracker.setTrackingContext?.({
            uniqueTrackingId,
            context: {
              documentContext: mockDocumentContext,
              model,
            },
          });

          expect(mockTrackStructEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
            [
              expect.any(Object),
              {
                schema: 'iglu:com.gitlab/code_suggestions_context/jsonschema/3-5-0',
                data: expect.objectContaining({
                  model_name: null,
                  model_engine: null,
                  language: mockLanguage,
                  ...expectedResult,
                }),
              },
            ],
          );
        });
      });

      it('should track event with proper suggestion source', () => {
        const expectedSuggestionSource = SuggestionSource.cache;
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
            source: expectedSuggestionSource,
          },
        });

        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
          [
            expect.any(Object),
            expect.objectContaining({
              data: expect.objectContaining({ suggestion_source: expectedSuggestionSource }),
            }),
          ],
        );
      });

      it('should add the streaming-specific data when `isStreaming="true"', () => {
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
            source: SuggestionSource.network,
            isStreaming: true,
          },
        });

        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
          [
            expect.any(Object),
            expect.objectContaining({ data: expect.objectContaining({ is_streaming: true }) }),
          ],
        );
      });

      it('should update the Code Suggestion context and track further events with it', () => {
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
          },
        });
        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
          [
            expect.any(Object),
            expect.objectContaining({
              data: expect.objectContaining({
                language: mockLanguage,
                model_engine: null,
                model_name: null,
              }),
            }),
          ],
        );
        const model: ICodeSuggestionModel = {
          engine: 'vertex-ai',
          name: 'code-gecko@latest',
          lang: 'js',
        };

        const apiStatusCode = 200;

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            model,
            status: apiStatusCode,
          },
        });

        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);

        expect(mockTrackStructEvent.mock.calls.length).toEqual(3);
        expect(mockTrackStructEvent.mock.calls[2]).toEqual([
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN }),
          [
            expect.any(Object),
            expect.objectContaining({
              data: expect.objectContaining({
                language: model.lang,
                model_engine: model.engine,
                model_name: model.name,
              }),
            }),
          ],
        ]);
      });

      it('should update the Code Suggestion context and track further events with it even if the request failed', () => {
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
          },
        });

        const model = undefined;
        const apiStatusCode = 400;
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            model,
            status: apiStatusCode,
          },
        });

        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED, uniqueTrackingId);

        expect(mockTrackStructEvent.mock.calls.length).toEqual(2);
        expect(mockTrackStructEvent.mock.calls[1]).toEqual([
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.ERRORED }),
          [
            expect.any(Object),
            expect.objectContaining({
              data: expect.objectContaining({ api_status_code: apiStatusCode }),
            }),
          ],
        ]);
      });

      it('should track multiple-option suggestion attributes', () => {
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
            optionsCount: 3,
            triggerKind: InlineCompletionTriggerKind.Invoked,
          },
        });

        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
          [
            expect.any(Object),
            expect.objectContaining({
              data: expect.objectContaining({
                options_count: 3,
                is_invoked: true,
              }),
            }),
          ],
        );

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            acceptedOption: 2,
          },
        });

        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED, uniqueTrackingId);

        expect(mockTrackStructEvent.mock.calls[1]).toEqual([
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED }),
          [
            expect.any(Object),
            {
              schema: 'iglu:com.gitlab/code_suggestions_context/jsonschema/3-5-0',
              data: expect.objectContaining({
                is_invoked: true,
                options_count: 3,
                accepted_option: 2,
              }),
            },
          ],
        ]);
      });

      it('should track tokens consumption metadata', () => {
        const tokensConsumptionMetadata = {
          input_tokens: 100,
          output_tokens: 50,
          context_tokens_sent: 200,
          context_tokens_used: 150,
        };

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
          },
        });

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            model: {
              lang: 'typescript',
              engine: 'test-engine',
              name: 'test-model',
              tokens_consumption_metadata: tokensConsumptionMetadata,
            },
          },
        });

        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED }),
          [
            expect.any(Object),
            expect.objectContaining({
              data: expect.objectContaining({
                input_tokens: tokensConsumptionMetadata.input_tokens,
                output_tokens: tokensConsumptionMetadata.output_tokens,
                context_tokens_sent: tokensConsumptionMetadata.context_tokens_sent,
                context_tokens_used: tokensConsumptionMetadata.context_tokens_used,
              }),
            }),
          ],
        );
      });

      it('should track the direct connection', () => {
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
            isDirectConnection: true,
          },
        });

        expect(mockTrackStructEvent).toHaveBeenCalledWith(expect.any(Object), [
          expect.any(Object),
          expect.objectContaining({
            data: expect.objectContaining({
              is_direct_connection: true,
            }),
          }),
        ]);

        mockTrackStructEvent.mockClear();

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            isDirectConnection: false,
          },
        });
        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

        expect(mockTrackStructEvent).toHaveBeenCalledWith(expect.any(Object), [
          expect.any(Object),
          expect.objectContaining({
            data: expect.objectContaining({
              is_direct_connection: false,
            }),
          }),
        ]);
      });

      describe.each`
        featureFlagsEnabled | additionalContexts        | expected
        ${true}             | ${mockAdditionalContexts} | ${true}
        ${true}             | ${[]}                     | ${false}
        ${false}            | ${[]}                     | ${null}
      `('should track $expected', ({ featureFlagsEnabled, additionalContexts, expected }) => {
        it(`when FFs enabled is "${featureFlagsEnabled}" and advanced context available is "${Boolean(additionalContexts.length)}"`, () => {
          jest.mocked(shouldUseAdvancedContext).mockReturnValueOnce(featureFlagsEnabled);

          snowplowTracker.setTrackingContext?.({
            uniqueTrackingId,
            context: {
              documentContext: mockDocumentContext,
              additionalContexts,
            },
          });

          expect(mockTrackStructEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
            [
              expect.any(Object),
              expect.objectContaining({
                data: expect.objectContaining({
                  has_advanced_context: expected,
                }),
              }),
            ],
          );
        });
      });

      it('it should get advanced context data if available', () => {
        jest.mocked(shouldUseAdvancedContext).mockReturnValueOnce(true);

        const additionalContexts = [
          {
            name: 'file1.ts',
            type: 'file' as const,
            resolution_strategy: 'open_tabs' as const,
            content: 'content1',
          },
          {
            name: 'file2.js',
            type: 'file' as const,
            resolution_strategy: 'open_tabs' as const,
            content: 'content2',
          },
        ];

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
            additionalContexts,
          },
        });

        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({ action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED }),
          [
            expect.any(Object),
            expect.objectContaining({
              data: expect.objectContaining({
                has_advanced_context: true,
                total_context_size_bytes: expect.any(Number),
                content_above_cursor_size_bytes: expect.any(Number),
                content_below_cursor_size_bytes: expect.any(Number),
                context_items: [
                  {
                    file_extension: 'ts',
                    type: 'file',
                    resolution_strategy: 'open_tabs',
                    byte_size: expect.any(Number),
                  },
                  {
                    file_extension: 'js',
                    type: 'file',
                    resolution_strategy: 'open_tabs',
                    byte_size: expect.any(Number),
                  },
                ],
              }),
            }),
          ],
        );

        const expectedTotalContextSize = getByteSize('content1') + getByteSize('content2');
        const expectedContentAboveSize = getByteSize(mockDocumentContext.prefix);
        const expectedContentBelowSize = getByteSize(mockDocumentContext.suffix);

        expect(mockTrackStructEvent.mock.calls[0][1][1].data.total_context_size_bytes).toBe(
          expectedTotalContextSize,
        );
        expect(mockTrackStructEvent.mock.calls[0][1][1].data.content_above_cursor_size_bytes).toBe(
          expectedContentAboveSize,
        );
        expect(mockTrackStructEvent.mock.calls[0][1][1].data.content_below_cursor_size_bytes).toBe(
          expectedContentBelowSize,
        );
        expect(mockTrackStructEvent.mock.calls[0][1][1].data.context_items[0].byte_size).toBe(
          getByteSize('content1'),
        );
        expect(mockTrackStructEvent.mock.calls[0][1][1].data.context_items[1].byte_size).toBe(
          getByteSize('content2'),
        );
      });
    });
  });

  describe('Schema validation', () => {
    it(`should track events when event's context validated against the schema`, () => {
      mockSchemaValidate.mockReturnValue(true);

      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });

      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);
      expect(mockTrackStructEvent).toHaveBeenCalledTimes(2);
    });

    it(`should NOT track events when event's context failed to validate against the schema`, () => {
      mockSchemaValidate.mockReturnValue(false);

      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);
      expect(mockTrackStructEvent).not.toHaveBeenCalled();
    });
  });

  describe('State management', () => {
    it('should send a state of requested when the suggestion is created', () => {
      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });

      expect(mockTrackStructEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
          category: 'code_suggestions',
        }),
        expect.any(Array),
      );
    });

    it('should update state of an existing suggestion when transition is valid', () => {
      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });
      mockTrackStructEvent.mockClear();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

      expect(mockTrackStructEvent).toBeCalledWith(
        expect.objectContaining({
          action: CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED,
          category: 'code_suggestions',
        }),
        expect.any(Array),
      );
    });

    it('should remove suggestions after 60s', () => {
      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });
      mockTrackStructEvent.mockClear();
      jest.advanceTimersByTime(60000);

      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

      expect(mockTrackStructEvent).toBeCalledTimes(0);
    });

    it('should not update state of an existing suggestion when transition is invalid', () => {
      // Sets suggestion state to `suggestion_requested`.
      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });
      mockTrackStructEvent.mockClear();
      // Invalid state transition: `suggestion_requested` to `suggestion_rejected`.
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId);

      expect(mockTrackStructEvent).toBeCalledTimes(0);
    });

    it('should perform invalid transition when new state is "suggestion_accepted"', () => {
      snowplowTracker.setTrackingContext?.({
        uniqueTrackingId,
        context: {
          documentContext: mockDocumentContext,
        },
      });
      mockTrackStructEvent.mockClear();
      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED, uniqueTrackingId);

      expect(mockTrackStructEvent).toBeCalledTimes(1);
      expect(mockTrackStructEvent).toBeCalledWith(
        expect.objectContaining({
          action: CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED,
          category: 'code_suggestions',
        }),
        expect.any(Array),
      );
    });

    it('should not update state if suggestion does not exist', () => {
      const nonExistentID = 'unknown';

      snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, nonExistentID);

      expect(mockTrackStructEvent).not.toBeCalled();
    });

    describe('Rejection', () => {
      beforeEach(() => {
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId,
          context: {
            documentContext: mockDocumentContext,
          },
        });

        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.LOADED, uniqueTrackingId);

        snowplowTracker.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.SHOWN, uniqueTrackingId);
        // We must clear the mock explicitly in this case, since we want to
        // ignore calls to the mock caused by the above statements.
        // eslint-disable-next-line no-restricted-syntax
        mockTrackStructEvent.mockClear();
      });

      it('should reject all open suggestions', () => {
        configService.set('client.telemetry.actions', [
          { action: CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED },
        ]);
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId: generateUniqueTrackingId(),
          context: {
            documentContext: mockDocumentContext,
          },
        });

        expect(mockTrackStructEvent.mock.calls.length).toEqual(2);
        expect(mockTrackStructEvent.mock.calls[0]).toEqual([
          expect.objectContaining({
            action: CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED,
            category: 'code_suggestions',
          }),
          expect.any(Array),
        ]);
        expect(mockTrackStructEvent.mock.calls[1]).toEqual([
          expect.objectContaining({
            action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
            category: 'code_suggestions',
          }),
          expect.any(Array),
        ]);
      });

      it('should not auto-reject suggestions when client registers that it sends rejections', () => {
        configService.set('client.telemetry.actions', [
          { action: CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED },
        ]);

        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId: generateUniqueTrackingId(),
          context: {
            documentContext: mockDocumentContext,
          },
        });

        expect(mockTrackStructEvent.mock.calls.length).toEqual(1);
        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
            category: 'code_suggestions',
          }),
          expect.any(Array),
        );
      });

      it('should not auto-reject suggestions when client does not send accepted events', () => {
        configService.set('client.telemetry.actions', []);
        snowplowTracker.setTrackingContext?.({
          uniqueTrackingId: generateUniqueTrackingId(),
          context: {
            documentContext: mockDocumentContext,
          },
        });

        expect(mockTrackStructEvent.mock.calls.length).toEqual(1);
        expect(mockTrackStructEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED,
            category: 'code_suggestions',
          }),
          expect.any(Array),
        );
      });
    });
  });
});

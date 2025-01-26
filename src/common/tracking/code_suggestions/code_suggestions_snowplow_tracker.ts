/* eslint-disable camelcase */
import { SelfDescribingJson, StructuredEvent } from '@snowplow/tracker-core';
import { InlineCompletionTriggerKind } from 'vscode-languageserver';
import { TelemetryService } from '@khulnasoft/telemetry';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Logger, withPrefix } from '@khulnasoft/logging';
import { ConfigService, IConfig } from '../../config_service';
import { AdditionalContext, ResolutionStrategy } from '../../api_types';
import { shouldUseAdvancedContext } from '../../advanced_context/helpers';
import { FeatureFlagService } from '../../feature_flags';
import { IDocContext } from '../../document_transformer_service';
import { getByteSize } from '../../utils/byte_size';
import { KhulnaSoftApiClient } from '../../api';
import { SUGGESTIONS_DEBOUNCE_INTERVAL_MS } from '../../constants';
import { DefaultSupportedLanguagesService } from '../../suggestion/supported_languages_service';
import { SnowplowService } from '../snowplow/snowplow_service';
import { version as lsVersion } from '../ls_info.json';
import { ISnowplowClientContext, IClientContext } from '../snowplow/constants';
import { SAAS_INSTANCE_URL, GC_TIME } from '../constants';
import * as CodeSuggestionContextSchema from './schemas/code_suggestion_context-3-5-0.json';
import * as IdeExtensionContextSchema from './schemas/ide_extension_version-1-1-0.json';
import {
  CODE_SUGGESTIONS_CATEGORY,
  TELEMETRY_DISABLED_WARNING_MSG,
  TELEMETRY_ENABLED_MSG,
  CODE_SUGGESTIONS_TRACKING_EVENTS,
} from './constants';
import {
  CodeSuggestionsTelemetryEvent,
  CodeSuggestionsTelemetryEventContext,
  CodeSuggestionsTelemetryTrackingContext,
  GitlabRealm,
  ICodeSuggestionContextUpdate,
  ITelemetryOptions,
  SuggestionSource,
} from './code_suggestions_tracking_types';
import { canClientTrackEvent } from './utils';
import { CodeSuggestionTelemetryState } from './code_suggestions_telemetry_state_manager';

interface ContextItem {
  file_extension: string;
  type: AdditionalContext['type'];
  resolution_strategy: ResolutionStrategy;
  byte_size: number;
}

export interface ISnowplowCodeSuggestionContext {
  schema: string;
  data: {
    prefix_length?: number;
    suffix_length?: number;
    language?: string | null;
    gitlab_realm?: GitlabRealm;
    model_engine?: string | null;
    model_name?: string | null;
    api_status_code?: number | null;
    debounce_interval?: number | null;
    suggestion_source?: SuggestionSource;
    gitlab_global_user_id?: string | null;
    gitlab_instance_id?: string | null;
    gitlab_host_name?: string | null;
    gitlab_saas_duo_pro_namespace_ids: number[] | null;
    gitlab_instance_version: string | null;
    is_streaming?: boolean;
    is_invoked?: boolean | null;
    options_count?: number | null;
    accepted_option?: number | null;
    /**
     * boolean indicating whether the feature is enabled
     * and we sent context in the request
     */
    has_advanced_context?: boolean | null;
    /**
     * boolean indicating whether request is direct to cloud connector
     */
    is_direct_connection?: boolean | null;
    total_context_size_bytes?: number;
    content_above_cursor_size_bytes?: number;
    content_below_cursor_size_bytes?: number;
    /**
     * set of final context items sent to AI Gateway
     */
    context_items?: ContextItem[] | null;
    /**
     * total tokens used in request to model provider
     */
    input_tokens?: number | null;
    /**
     * total output tokens received from model provider
     */
    output_tokens?: number | null;
    /**
     * total tokens sent as context to AI Gateway
     */
    context_tokens_sent?: number | null;
    /**
     * total context tokens used in request to model provider
     */
    context_tokens_used?: number | null;
  };
}
export interface CodeSuggestionsSnowplowTracker
  extends TelemetryService<
    CodeSuggestionsTelemetryEvent,
    CodeSuggestionsTelemetryEventContext,
    CodeSuggestionsTelemetryTrackingContext
  > {}
export const CodeSuggestionsSnowplowTracker = createInterfaceId<CodeSuggestionsSnowplowTracker>(
  'CodeSuggestionsSnowplowTracker',
);
@Injectable(CodeSuggestionsSnowplowTracker, [
  ConfigService,
  FeatureFlagService,
  KhulnaSoftApiClient,
  SnowplowService,
  Logger,
])
export class DefaultCodeSuggestionsSnowplowTracker implements CodeSuggestionsSnowplowTracker {
  #snowplowService: SnowplowService;

  #configService: ConfigService;

  #api: KhulnaSoftApiClient;

  #suggestionStateManager: CodeSuggestionTelemetryState = new CodeSuggestionTelemetryState(
    'Snowplow Telemetry',
  );

  #logger: Logger;

  #options: ITelemetryOptions = {
    enabled: true,
    baseUrl: SAAS_INSTANCE_URL,
    // the list of events that the client can track themselves
    actions: [],
  };

  #clientContext: ISnowplowClientContext = {
    schema: 'iglu:com.gitlab/ide_extension_version/jsonschema/1-1-0',
    data: {},
  };

  #featureFlagService: FeatureFlagService;

  #gitlabRealm: GitlabRealm = GitlabRealm.saas;

  #codeSuggestionsContextMap = new Map<string, ISnowplowCodeSuggestionContext>();

  constructor(
    configService: ConfigService,
    featureFlagService: FeatureFlagService,
    api: KhulnaSoftApiClient,
    snowplowService: SnowplowService,
    logger: Logger,
  ) {
    this.#snowplowService = snowplowService;
    this.#configService = configService;
    this.#configService.onConfigChange((config) => this.#reconfigure(config));
    this.#api = api;

    this.#configService = configService;
    this.#featureFlagService = featureFlagService;
    this.#logger = withPrefix(logger, '[CodeSuggestionsSnowplowTelemetry]');
  }

  isEnabled(): boolean {
    return Boolean(this.#options.enabled);
  }

  async #reconfigure(config: IConfig) {
    const { baseUrl } = config.client;
    const enabled = config.client.telemetry?.enabled;
    const actions = config.client.telemetry?.actions;

    if (typeof enabled !== 'undefined' && this.#options.enabled !== enabled) {
      this.#options.enabled = enabled;

      if (enabled === false) {
        this.#logger.warn(TELEMETRY_DISABLED_WARNING_MSG);
      } else if (enabled === true) {
        this.#logger.info(TELEMETRY_ENABLED_MSG);
      }
    }

    if (baseUrl) {
      this.#options.baseUrl = baseUrl;
      this.#gitlabRealm = baseUrl.endsWith(SAAS_INSTANCE_URL)
        ? GitlabRealm.saas
        : GitlabRealm.selfManaged;
    }

    if (actions) {
      this.#options.actions = actions;
    }

    this.#setClientContext({
      extension: config.client.telemetry?.extension,
      ide: config.client.telemetry?.ide,
    });
  }

  #setClientContext(context: IClientContext) {
    this.#clientContext.data = {
      ide_name: context?.ide?.name ?? null,
      ide_vendor: context?.ide?.vendor ?? null,
      ide_version: context?.ide?.version ?? null,
      extension_name: context?.extension?.name ?? null,
      extension_version: context?.extension?.version ?? null,
      language_server_version: lsVersion ?? null,
    };
  }

  setTrackingContext({ uniqueTrackingId, context }: CodeSuggestionsTelemetryTrackingContext) {
    if (this.#codeSuggestionsContextMap.get(uniqueTrackingId)) {
      this.updateCodeSuggestionsContext(uniqueTrackingId, context);
    } else {
      this.setCodeSuggestionsContext(uniqueTrackingId, context);
    }
  }

  setCodeSuggestionsContext(
    uniqueTrackingId: string,
    context: Partial<ICodeSuggestionContextUpdate>,
  ) {
    const {
      documentContext,
      source = SuggestionSource.network,
      isStreaming,
      triggerKind,
      optionsCount,
      additionalContexts,
      isDirectConnection,
      model,
    } = context;

    const {
      gitlab_instance_id,
      gitlab_global_user_id,
      gitlab_host_name,
      gitlab_saas_duo_pro_namespace_ids,
    } = this.#configService.get('client.snowplowTrackerOptions') ?? {};

    if (source === SuggestionSource.cache) {
      this.#logger.debug(`Retrieved suggestion from cache`);
    } else {
      this.#logger.debug(`Received request to create a new suggestion`);
    }

    // Only auto-reject if client is set up to track accepted and not rejected events.
    if (
      canClientTrackEvent(this.#options.actions, CODE_SUGGESTIONS_TRACKING_EVENTS.ACCEPTED) &&
      !canClientTrackEvent(this.#options.actions, CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED)
    ) {
      this.#rejectOpenedSuggestions();
    }

    setTimeout(() => {
      if (this.#codeSuggestionsContextMap.has(uniqueTrackingId)) {
        this.#codeSuggestionsContextMap.delete(uniqueTrackingId);
        this.#suggestionStateManager.deleteSuggestion(uniqueTrackingId);
      }
    }, GC_TIME);

    // Use the language provided by the model, if present.
    // Otherwise determine the language from the file extension.
    const language =
      model?.lang ??
      DefaultSupportedLanguagesService.getLanguageForFile(documentContext?.fileRelativePath) ??
      null;

    const advancedContextData = this.#getAdvancedContextData({
      additionalContexts,
      documentContext,
    });
    this.#codeSuggestionsContextMap.set(uniqueTrackingId, {
      schema: 'iglu:com.gitlab/code_suggestions_context/jsonschema/3-5-0',
      data: {
        suffix_length: documentContext?.suffix.length ?? 0,
        prefix_length: documentContext?.prefix.length ?? 0,
        gitlab_realm: this.#gitlabRealm,
        model_engine: model?.engine ?? null,
        model_name: model?.name ?? null,
        language,
        api_status_code: null,
        debounce_interval: source === SuggestionSource.cache ? 0 : SUGGESTIONS_DEBOUNCE_INTERVAL_MS,
        suggestion_source: source,
        gitlab_global_user_id: gitlab_global_user_id ?? null,
        gitlab_host_name: gitlab_host_name ?? null,
        gitlab_instance_id: gitlab_instance_id ?? null,
        gitlab_saas_duo_pro_namespace_ids: gitlab_saas_duo_pro_namespace_ids ?? null,
        gitlab_instance_version: this.#api.instanceInfo?.instanceVersion ?? null,
        is_streaming: isStreaming ?? false,
        is_invoked: isCompletionInvoked(triggerKind),
        options_count: optionsCount ?? null,
        has_advanced_context: advancedContextData.hasAdvancedContext,
        is_direct_connection: isDirectConnection ?? null,
        total_context_size_bytes: advancedContextData.totalContextSizeBytes,
        content_above_cursor_size_bytes: advancedContextData.contentAboveCursorSizeBytes,
        content_below_cursor_size_bytes: advancedContextData.contentBelowCursorSizeBytes,
        context_items: advancedContextData.contextItems,
      },
    });

    this.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED, uniqueTrackingId);
  }

  // FIXME: the set and update context methods have similar logic and they should have to grow linearly with each new attribute
  // the solution might be some generic update method used by both
  updateCodeSuggestionsContext(
    uniqueTrackingId: string,
    contextUpdate: Partial<ICodeSuggestionContextUpdate>,
  ) {
    const context = this.#codeSuggestionsContextMap.get(uniqueTrackingId);
    const { model, status, optionsCount, acceptedOption, isDirectConnection } = contextUpdate;

    if (context) {
      if (model) {
        if (model.lang) {
          context.data.language = model.lang;
        }
        context.data.model_engine = model.engine ?? null;
        context.data.model_name = model.name ?? null;
        context.data.input_tokens = model?.tokens_consumption_metadata?.input_tokens ?? null;
        context.data.output_tokens = model.tokens_consumption_metadata?.output_tokens ?? null;
        context.data.context_tokens_sent =
          model.tokens_consumption_metadata?.context_tokens_sent ?? null;
        context.data.context_tokens_used =
          model.tokens_consumption_metadata?.context_tokens_used ?? null;
      }

      if (status) {
        context.data.api_status_code = status;
      }

      if (optionsCount) {
        context.data.options_count = optionsCount;
      }

      if (isDirectConnection !== undefined) {
        context.data.is_direct_connection = isDirectConnection;
      }

      if (acceptedOption) {
        context.data.accepted_option = acceptedOption;
      }

      this.#codeSuggestionsContextMap.set(uniqueTrackingId, context);
    }
  }

  async #trackCodeSuggestionsEvent(
    eventType: CODE_SUGGESTIONS_TRACKING_EVENTS,
    uniqueTrackingId: string,
  ) {
    if (!this.isEnabled()) {
      return;
    }

    const event: StructuredEvent = {
      category: CODE_SUGGESTIONS_CATEGORY,
      action: eventType,
      label: uniqueTrackingId,
    };

    try {
      const contexts: SelfDescribingJson[] = [this.#clientContext];
      const codeSuggestionContext = this.#codeSuggestionsContextMap.get(uniqueTrackingId);

      if (codeSuggestionContext) {
        contexts.push(codeSuggestionContext);
      }

      const suggestionContextValid = this.#snowplowService.validateContext(
        CodeSuggestionContextSchema,
        codeSuggestionContext?.data,
      );

      if (!suggestionContextValid) {
        return;
      }
      const ideExtensionContextValid = this.#snowplowService.validateContext(
        IdeExtensionContextSchema,
        this.#clientContext?.data,
      );
      if (!ideExtensionContextValid) {
        return;
      }

      await this.#snowplowService.trackStructuredEvent(event, contexts);
    } catch (error) {
      this.#logger.warn(`Failed to track telemetry event: ${eventType}`, error);
    }
  }

  trackEvent(
    event: CodeSuggestionsTelemetryEvent,
    uniqueTrackingId: CodeSuggestionsTelemetryEventContext,
  ): void {
    const isStreaming = Boolean(
      this.#codeSuggestionsContextMap.get(uniqueTrackingId)?.data.is_streaming,
    );
    if (this.#suggestionStateManager.canUpdateState(uniqueTrackingId, event, isStreaming)) {
      this.#suggestionStateManager.updateSuggestionState(uniqueTrackingId, event, isStreaming);
      this.#trackCodeSuggestionsEvent(event, uniqueTrackingId).catch((e) =>
        this.#logger.warn('Could not track telemetry', e),
      );
    }
  }

  #rejectOpenedSuggestions() {
    this.#logger.debug(`Reject all opened suggestions`);
    this.#suggestionStateManager
      .getOpenedSuggestions()
      .forEach((uniqueTrackingId) =>
        this.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId),
      );
  }

  #hasAdvancedContext(advancedContexts?: AdditionalContext[]): boolean | null {
    const advancedContextFeatureFlagsEnabled = shouldUseAdvancedContext(
      this.#featureFlagService,
      this.#configService,
    );

    if (advancedContextFeatureFlagsEnabled) {
      return Boolean(advancedContexts?.length);
    }

    return null;
  }

  #getAdvancedContextData({
    additionalContexts,
    documentContext,
  }: {
    additionalContexts?: AdditionalContext[];
    documentContext?: IDocContext;
  }) {
    const hasAdvancedContext = this.#hasAdvancedContext(additionalContexts);

    const contentAboveCursorSizeBytes = documentContext?.prefix
      ? getByteSize(documentContext.prefix)
      : 0;
    const contentBelowCursorSizeBytes = documentContext?.suffix
      ? getByteSize(documentContext.suffix)
      : 0;

    const contextItems: ContextItem[] | null =
      additionalContexts?.map((item) => ({
        file_extension: item.name.split('.').pop() || '',
        type: item.type,
        resolution_strategy: item.resolution_strategy,
        byte_size: item?.content ? getByteSize(item.content) : 0,
      })) ?? null;

    const totalContextSizeBytes =
      contextItems?.reduce((total, item) => total + item.byte_size, 0) ?? 0;

    return {
      totalContextSizeBytes,
      contentAboveCursorSizeBytes,
      contentBelowCursorSizeBytes,
      contextItems,
      hasAdvancedContext,
    };
  }
}

function isCompletionInvoked(triggerKind?: InlineCompletionTriggerKind): boolean | null {
  let isInvoked = null;

  if (triggerKind === InlineCompletionTriggerKind.Invoked) {
    isInvoked = true;
  } else if (triggerKind === InlineCompletionTriggerKind.Automatic) {
    isInvoked = false;
  }

  return isInvoked;
}

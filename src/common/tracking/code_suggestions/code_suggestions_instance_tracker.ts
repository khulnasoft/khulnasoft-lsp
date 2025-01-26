import { TelemetryService } from '@khulnasoft/telemetry';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Logger, withPrefix } from '@khulnasoft/logging';
import { KhulnaSoftApiClient } from '../../api';
import { ConfigService, IConfig } from '../../config_service';
import { FixedTimeCircuitBreaker } from '../../circuit_breaker/fixed_time_circuit_breaker';
import { SuggestionOption } from '../../api_types';
import { InvalidInstanceVersionError } from '../../fetch_error';
import { GC_TIME } from '../constants';
import {
  CODE_SUGGESTIONS_TRACKING_EVENTS,
  INSTANCE_TRACKING_EVENTS_MAP,
  TELEMETRY_DISABLED_WARNING_MSG,
  TELEMETRY_ENABLED_MSG,
} from './constants';
import {
  CodeSuggestionsTelemetryEvent,
  CodeSuggestionsTelemetryEventContext,
  CodeSuggestionsTelemetryTrackingContext,
  ICodeSuggestionContextUpdate,
  ITelemetryOptions,
} from './code_suggestions_tracking_types';
import { canClientTrackEvent } from './utils';
import { CodeSuggestionTelemetryState } from './code_suggestions_telemetry_state_manager';

interface СodeSuggestionContext {
  language?: string;
  suggestion_size?: number;
  timestamp: string;
  is_streaming?: boolean;
}

export interface CodeSuggestionsInstanceTracker
  extends TelemetryService<
    CodeSuggestionsTelemetryEvent,
    CodeSuggestionsTelemetryEventContext,
    CodeSuggestionsTelemetryTrackingContext
  > {}
export const CodeSuggestionsInstanceTracker = createInterfaceId<CodeSuggestionsInstanceTracker>(
  'CodeSuggestionsInstanceTracker',
);

@Injectable(CodeSuggestionsInstanceTracker, [KhulnaSoftApiClient, ConfigService, Logger])
export class DefaultCodeSuggestionsInstanceTracker implements CodeSuggestionsInstanceTracker {
  #api: KhulnaSoftApiClient;

  #codeSuggestionsContextMap = new Map<string, СodeSuggestionContext>();

  #circuitBreaker = new FixedTimeCircuitBreaker();

  #configService: ConfigService;

  #logger: Logger;

  #options: ITelemetryOptions = {
    enabled: true,
    actions: [],
  };

  #suggestionStateManager: CodeSuggestionTelemetryState = new CodeSuggestionTelemetryState(
    'Instance Telemetry',
  );

  // API used for tracking events is available since KhulnaSoft v17.2.0.
  // Given the track request is done for each CS request
  // we need to  make sure we do not log the unsupported instance message many times
  #invalidInstanceMsgLogged = false;

  constructor(api: KhulnaSoftApiClient, configService: ConfigService, logger: Logger) {
    this.#configService = configService;
    this.#configService.onConfigChange((config) => this.#reconfigure(config));
    this.#api = api;
    this.#logger = withPrefix(logger, '[CodeSuggestionsInstanceTelemetry]');
    this.#circuitBreaker.onClose(() =>
      this.#logger.info(
        'Warning: Too many failures when sending telemetry to your KhulnaSoft instance. Please retry later.',
      ),
    );
    this.#circuitBreaker.onOpen(() =>
      this.#logger.warn('From now on, we will try to send telemetry to your KhulnaSoft instance again'),
    );
  }

  #reconfigure(config: IConfig) {
    const { baseUrl } = config.client;
    const enabled = config.client.telemetry?.enabled;
    const actions = config.client.telemetry?.actions;

    if (typeof enabled !== 'undefined' && this.#options.enabled !== enabled) {
      this.#options.enabled = enabled;

      if (enabled === false) {
        this.#logger.warn(`Instance Telemetry: ${TELEMETRY_DISABLED_WARNING_MSG}`);
      } else if (enabled === true) {
        this.#logger.info(`Instance Telemetry: ${TELEMETRY_ENABLED_MSG}`);
      }
    }

    if (baseUrl) {
      this.#options.baseUrl = baseUrl;
    }

    if (actions) {
      this.#options.actions = actions;
    }
  }

  isEnabled(): boolean {
    return Boolean(this.#options.enabled);
  }

  async setTrackingContext({ uniqueTrackingId, context }: CodeSuggestionsTelemetryTrackingContext) {
    if (this.#codeSuggestionsContextMap.get(uniqueTrackingId)) {
      await this.updateCodeSuggestionsContext(uniqueTrackingId, context);
    } else {
      this.setCodeSuggestionsContext(uniqueTrackingId, context);
    }
  }

  setCodeSuggestionsContext(
    uniqueTrackingId: string,
    context: Partial<ICodeSuggestionContextUpdate>,
  ) {
    if (this.#circuitBreaker.isOpen()) {
      return;
    }

    const { model, isStreaming, suggestionOptions } = context;

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

    this.#codeSuggestionsContextMap.set(uniqueTrackingId, {
      is_streaming: isStreaming,
      language: model?.lang,
      timestamp: new Date().toISOString(),
      suggestion_size: calculateSuggestionSize(suggestionOptions),
    });

    if (this.#isStreamingSuggestion(uniqueTrackingId)) return;

    this.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REQUESTED, uniqueTrackingId);
  }

  async updateCodeSuggestionsContext(
    uniqueTrackingId: string,
    contextUpdate: Partial<ICodeSuggestionContextUpdate>,
  ) {
    if (this.#circuitBreaker.isOpen()) {
      return;
    }

    if (this.#isStreamingSuggestion(uniqueTrackingId)) return;

    const context = this.#codeSuggestionsContextMap.get(uniqueTrackingId);
    const { model, suggestionOptions, isStreaming } = contextUpdate;

    if (context) {
      if (model) {
        context.language = model?.lang;
      }

      if (suggestionOptions?.length) {
        context.suggestion_size = calculateSuggestionSize(suggestionOptions);
      }

      if (typeof isStreaming === 'boolean') {
        context.is_streaming = isStreaming;
      }

      this.#codeSuggestionsContextMap.set(uniqueTrackingId, context);
    }
  }

  trackEvent(
    event: CodeSuggestionsTelemetryEvent,
    uniqueTrackingId: CodeSuggestionsTelemetryEventContext,
  ): void {
    if (!this.isEnabled()) return;

    const isStreaming = this.#isStreamingSuggestion(uniqueTrackingId);

    if (isStreaming) return;

    if (this.#suggestionStateManager.canUpdateState(uniqueTrackingId, event, isStreaming)) {
      this.#suggestionStateManager.updateSuggestionState(uniqueTrackingId, event, isStreaming);
      this.#trackCodeSuggestionsEvent(event, uniqueTrackingId).catch((e) =>
        this.#logger.warn('Instance Telemetry: Could not track telemetry', e),
      );
    }
  }

  async #trackCodeSuggestionsEvent(
    eventType: CODE_SUGGESTIONS_TRACKING_EVENTS,
    uniqueTrackingId: string,
  ) {
    const event = INSTANCE_TRACKING_EVENTS_MAP[eventType];

    if (!event) {
      return;
    }

    try {
      const { language, suggestion_size } =
        this.#codeSuggestionsContextMap.get(uniqueTrackingId) ?? {};

      await this.#api.fetchFromApi({
        type: 'rest',
        method: 'POST',
        path: '/usage_data/track_event',
        body: {
          event,
          additional_properties: {
            unique_tracking_id: uniqueTrackingId,
            timestamp: new Date().toISOString(),
            language,
            suggestion_size,
          },
        },
        supportedSinceInstanceVersion: {
          resourceName: 'track instance telemetry',
          version: '17.2.0',
        },
      });

      this.#circuitBreaker.success();
    } catch (error) {
      if (error instanceof InvalidInstanceVersionError) {
        if (this.#invalidInstanceMsgLogged) return;

        this.#invalidInstanceMsgLogged = true;
      }

      this.#logger.warn(`Instance telemetry: Failed to track event: ${eventType}`, error);
      this.#circuitBreaker.error();
    }
  }

  #rejectOpenedSuggestions() {
    this.#logger.debug(`Instance Telemetry: Reject all opened suggestions`);
    this.#suggestionStateManager
      .getOpenedSuggestions()
      .forEach((uniqueTrackingId) =>
        this.trackEvent(CODE_SUGGESTIONS_TRACKING_EVENTS.REJECTED, uniqueTrackingId),
      );
  }

  #isStreamingSuggestion(uniqueTrackingId: string): boolean {
    return Boolean(this.#codeSuggestionsContextMap.get(uniqueTrackingId)?.is_streaming);
  }
}

function calculateSuggestionSize(options: SuggestionOption[] = []): number {
  const countLines = (text: string) => (text ? text.split('\n').length : 0);

  return Math.max(0, ...options.map(({ text }) => countLines(text)));
}

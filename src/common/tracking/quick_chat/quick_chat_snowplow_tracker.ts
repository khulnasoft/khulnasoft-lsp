import { SelfDescribingJson, StructuredEvent } from '@snowplow/tracker-core';
import { TelemetryService } from '@khulnasoft/telemetry';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Logger, withPrefix } from '@khulnasoft/logging';
import { ConfigService, IConfig } from '../../config_service';
import { SnowplowService } from '../snowplow/snowplow_service';
import { SAAS_INSTANCE_URL } from '../constants';
import { ISnowplowClientContext, IClientContext } from '../snowplow/constants';
import { version as lsVersion } from '../ls_info.json';
import * as IdeExtensionContextSchema from '../code_suggestions/schemas/ide_extension_version-1-1-0.json';
import * as StandardContextSchema from '../snowplow/schemas/standard_context_schema-1-1-1.json';
import { StandardContext } from '../snowplow/standard_context';

export const QUICK_CHAT_CATEGORY = 'gitlab_quick_chat';

export enum QUICK_CHAT_OPEN_TRIGGER {
  BTN_CLICK = 'click_button',
  SHORTCUT = 'shortcut',
}

export enum QUICK_CHAT_EVENT {
  MESSAGE_SENT = 'message_sent',
  CHAT_OPEN = 'open_quick_chat',
}

export interface QuickChatContext {
  trigger: QUICK_CHAT_OPEN_TRIGGER;
  message: string;
}

export interface QuickChatSnowplowTracker
  extends TelemetryService<QUICK_CHAT_EVENT, QuickChatContext, null> {}
export const QuickChatSnowplowTracker = createInterfaceId<QuickChatSnowplowTracker>(
  'SnowplowQuickChatTracker',
);
@Injectable(QuickChatSnowplowTracker, [ConfigService, SnowplowService, StandardContext, Logger])
export class DefaulQuickChatSnowplowTracker implements QuickChatSnowplowTracker {
  #snowplowService: SnowplowService;

  #configService: ConfigService;

  #standardContext: StandardContext;

  #logger: Logger;

  #options = {
    enabled: true,
    baseUrl: SAAS_INSTANCE_URL,
  };

  #clientContext: ISnowplowClientContext = {
    schema: 'iglu:com.gitlab/ide_extension_version/jsonschema/1-1-0',
    data: {},
  };

  constructor(
    configService: ConfigService,
    snowplowService: SnowplowService,
    standardContext: StandardContext,
    logger: Logger,
  ) {
    this.#configService = configService;
    this.#configService.onConfigChange((config) => this.#reconfigure(config));
    this.#snowplowService = snowplowService;
    this.#standardContext = standardContext;
    this.#logger = withPrefix(logger, '[QuickChatSnowplowTelemetry]');
  }

  isEnabled(): boolean {
    return this.#options.enabled;
  }

  async #reconfigure(config: IConfig) {
    const { baseUrl } = config.client;
    const enabled = config.client.telemetry?.enabled;

    if (typeof enabled !== 'undefined' && this.#options.enabled !== enabled) {
      this.#options.enabled = enabled;

      if (enabled === false) {
        this.#logger.warn(
          `Quick Chat Telemetry is disabled. Please, consider enabling telemetry to improve our service.`,
        );
      } else if (enabled === true) {
        this.#logger.info(`Quick Chat Telemetry is enabled.`);
      }
    }

    if (baseUrl) {
      this.#options.baseUrl = baseUrl;
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

  async trackEvent(event: QUICK_CHAT_EVENT, context: QuickChatContext) {
    const { action, label } = this.#getEventContext(event, context) ?? {};

    if (!action || !label) return;

    const structuredEvent: StructuredEvent = {
      category: QUICK_CHAT_CATEGORY,
      action,
      label,
    };

    try {
      const standardContext = this.#standardContext.build();
      const contexts: SelfDescribingJson[] = [standardContext, this.#clientContext];

      const standardContextValid = this.#snowplowService.validateContext(
        StandardContextSchema,
        standardContext.data,
      );

      if (!standardContextValid) {
        return;
      }

      const ideExtensionContextValid = this.#snowplowService.validateContext(
        IdeExtensionContextSchema,
        this.#clientContext?.data,
      );

      if (!ideExtensionContextValid) {
        return;
      }

      await this.#snowplowService.trackStructuredEvent(structuredEvent, contexts);
    } catch (error) {
      this.#logger.warn(`Quick Chat telemetry: Failed to track telemetry event: ${action}`, error);
    }
  }

  #getEventContext(
    event: QUICK_CHAT_EVENT,
    context: QuickChatContext,
  ): { action: string; label?: string } | undefined {
    if (event === QUICK_CHAT_EVENT.MESSAGE_SENT) {
      return {
        action: event,
        label: getMessageSentEventLabel(context.message),
      };
    }
    if (event === QUICK_CHAT_EVENT.CHAT_OPEN) {
      return {
        action: event,
        label: context.trigger,
      };
    }

    return undefined;
  }
}

export function getMessageSentEventLabel(message: string) {
  const prefix = message.split(' ')[0];
  if (['/explain', '/refactor', '/fix', '/tests'].includes(prefix)) return prefix;
  if (['/reset', '/clear', '/clean'].includes(prefix)) return undefined;
  return 'general_message';
}

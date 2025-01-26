import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { SelfDescribingJson, StructuredEvent } from '@snowplow/tracker-core';
import { TelemetryService } from '@khulnasoft/telemetry';
import { Logger, withPrefix } from '@khulnasoft/logging';
import { version as lsVersion } from '../ls_info.json';
import { ConfigService, IConfig } from '../../config_service';
import { SnowplowService } from '../snowplow/snowplow_service';
import { IClientContext, ISnowplowClientContext } from '../snowplow/constants';
import { StandardContext } from '../snowplow/standard_context';
import * as StandardContextSchema from '../snowplow/schemas/standard_context_schema-1-1-1.json';
import * as IdeExtensionContextSchema from '../code_suggestions/schemas/ide_extension_version-1-1-0.json';

export const SECURITY_DIAGNOSTICS_CATEGORY = 'sast_security_diagnostics';

export enum SECURITY_DIAGNOSTICS_EVENT {
  SCAN_INITIATED = 'scan_initiated',
  SCAN_RESULTS_VIEW_OPENED = 'scan_results_view_opened',
}

export interface SecurityDiagnosticsContext {
  source: string;
}

export interface SecurityDiagnosticsTracker
  extends TelemetryService<SECURITY_DIAGNOSTICS_EVENT, SecurityDiagnosticsContext, null> {}

export const SecurityDiagnosticsTracker = createInterfaceId<SecurityDiagnosticsTracker>(
  'SecurityDiagnosticsTracker',
);

@Injectable(SecurityDiagnosticsTracker, [ConfigService, SnowplowService, StandardContext, Logger])
export class DefaultSecurityDiagnosticsTracker implements SecurityDiagnosticsTracker {
  #configService: ConfigService;

  #snowplowService: SnowplowService;

  #standardContext: StandardContext;

  #logger: Logger;

  #clientContext: ISnowplowClientContext = {
    schema: 'iglu:com.gitlab/ide_extension_version/jsonschema/1-1-0',
    data: {},
  };

  #enabled: boolean = true;

  constructor(
    configService: ConfigService,
    snowplowService: SnowplowService,
    standardContext: StandardContext,
    logger: Logger,
  ) {
    this.#configService = configService;
    this.#snowplowService = snowplowService;
    this.#configService.onConfigChange((config) => this.#reconfigure(config));
    this.#standardContext = standardContext;
    this.#logger = withPrefix(logger, '[SecurityDiagnosticsTracker]');
  }

  #reconfigure(config: IConfig): void {
    const enabled = config.client.telemetry?.enabled;

    if (typeof enabled !== 'undefined' && this.#enabled !== enabled) {
      this.#enabled = enabled;

      if (enabled === false) {
        this.#logger.warn(
          `Telemetry is disabled. Please, consider enabling telemetry to improve our service.`,
        );
      } else if (enabled === true) {
        this.#logger.info(`Telemetry is enabled.`);
      }
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

  async trackEvent(
    event: SECURITY_DIAGNOSTICS_EVENT,
    context?: SecurityDiagnosticsContext | undefined,
  ): Promise<void> {
    const structuredEvent: StructuredEvent = {
      category: SECURITY_DIAGNOSTICS_CATEGORY,
      action: event,
      label: context?.source,
    };
    try {
      const standardContext = this.#standardContext.build();
      const contexts: SelfDescribingJson[] = [standardContext, this.#clientContext];

      const isStandardContextValid = this.#snowplowService.validateContext(
        StandardContextSchema,
        standardContext.data,
      );

      if (!isStandardContextValid) {
        return;
      }

      const isIdeExtensionContextValid = this.#snowplowService.validateContext(
        IdeExtensionContextSchema,
        this.#clientContext?.data,
      );

      if (!isIdeExtensionContextValid) {
        return;
      }

      await this.#snowplowService.trackStructuredEvent(structuredEvent, contexts);
      this.#logger.debug(`Successfully tracked telemetry event: ${structuredEvent}`);
    } catch (error) {
      this.#logger.warn(
        `Failed to track telemetry event: ${SECURITY_DIAGNOSTICS_EVENT.SCAN_INITIATED}`,
        error,
      );
    }
  }

  isEnabled(): boolean {
    return this.#enabled;
  }
}

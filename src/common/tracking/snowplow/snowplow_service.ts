import {
  Payload,
  PayloadBuilder,
  SelfDescribingJson,
  StructuredEvent,
  buildStructEvent,
  trackerCore,
  TrackerCore,
} from '@snowplow/tracker-core';
import { v4 as uuidv4 } from 'uuid';
import Ajv, { JSONSchemaType, Schema } from 'ajv-draft-04';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { isEqual } from 'lodash';
import { LsFetch } from '../../fetch';
import { log } from '../../log';
import { ConfigService } from '../../config_service';
import { Emitter } from './emitter';
import {
  EVENT_VALIDATION_ERROR_MSG,
  DEFAULT_SNOWPLOW_OPTIONS,
  DEFAULT_TRACKING_ENDPOINT,
} from './constants';
import * as SnowplowMetaSchema from './schemas/snowplow_schema-1-0-0.json';

export type EnabledCallback = () => boolean;

export type SnowplowOptions = {
  appId: string;
  endpoint: string;
  timeInterval: number;
  maxItems: number;
  enabled: EnabledCallback;
};

/**
 * Adds the 'stm' parameter with the current time to the payload
 * Stringify all payload values
 * @param payload - The payload which will be mutated
 */
function preparePayload(payload: Payload): Record<string, string> {
  const stringifiedPayload: Record<string, string> = {};

  Object.keys(payload).forEach((key) => {
    stringifiedPayload[key] = String(payload[key]);
  });

  stringifiedPayload.stm = new Date().getTime().toString();

  return stringifiedPayload;
}

export interface SnowplowService {
  trackStructuredEvent(event: StructuredEvent, contexts: SelfDescribingJson[]): void;

  validateContext(schema: JSONSchemaType<unknown> | Schema | string, data: unknown): boolean;

  stop: () => void;
}

export const SnowplowService = createInterfaceId<SnowplowService>('SnowplowService');

@Injectable(SnowplowService, [LsFetch, ConfigService])
export class DefaultSnowplowService {
  /** Disable sending events when it's not possible. */
  #disabled: boolean = false;

  #emitter!: Emitter;

  #lsFetch: LsFetch;

  #ajv = new Ajv({ strict: false });

  #options!: SnowplowOptions;

  #tracker!: TrackerCore;

  constructor(lsFetch: LsFetch, configService: ConfigService) {
    this.#lsFetch = lsFetch;
    this.#ajv.addMetaSchema(SnowplowMetaSchema);

    configService.onConfigChange(async (config) => {
      const trackingUrl = config.client.telemetry?.trackingUrl;
      if (trackingUrl) {
        await this.#reconfigure({ endpoint: trackingUrl });
      }
    });

    this.#configure({
      ...DEFAULT_SNOWPLOW_OPTIONS,
      endpoint: configService.get('client.telemetry.trackingUrl') ?? DEFAULT_TRACKING_ENDPOINT,
      enabled: () => configService.get('client.telemetry.enabled') ?? true,
    });
  }

  #configure(options: SnowplowOptions) {
    this.#options = options;
    this.#emitter = new Emitter(
      this.#options.timeInterval,
      this.#options.maxItems,
      this.#sendEvent.bind(this),
    );
    this.#emitter.start();
    this.#tracker = trackerCore({ callback: this.#emitter.add.bind(this.#emitter) });
  }

  async #reconfigure(options: Partial<SnowplowOptions>) {
    const newOptions = {
      ...this.#options,
      ...options,
    };

    if (!isEqual(this.#options, newOptions)) {
      await this.#emitter?.stop();
      this.#configure(newOptions);
    }
  }

  async trackStructuredEvent(
    event: StructuredEvent,
    context?: SelfDescribingJson[] | null,
  ): Promise<void> {
    try {
      this.#tracker.track(buildStructEvent(event), context);
    } catch (error) {
      log.warn('Failed to track Snowplow event', error);
    }
  }

  validateContext(schema: JSONSchemaType<unknown> | Schema | string, data: unknown): boolean {
    const valid = this.#ajv.validate(schema, data);
    if (!valid) {
      log.warn(EVENT_VALIDATION_ERROR_MSG);
      log.debug(JSON.stringify(this.#ajv.errors, null, 2));
    }
    return valid;
  }

  async stop() {
    await this.#emitter.stop();
  }

  async #sendEvent(events: PayloadBuilder[]): Promise<void> {
    if (!this.#options.enabled() || this.#disabled) {
      return;
    }

    try {
      const url = `${this.#options.endpoint}/com.snowplowanalytics.snowplow/tp2`;
      const data = {
        schema: 'iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4',
        data: events.map((event) => {
          const eventId = uuidv4();
          // All values prefilled below are part of snowplow tracker protocol
          // https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/snowplow-tracker-protocol/#common-parameters
          // Values are set according to either common KhulnaSoft standard:
          // tna - representing tracker namespace and being set across KhulnaSoft to "gl"
          // tv - represents tracker value, to make it aligned with downstream system it has to be prefixed with "js-*""
          // aid - represents app Id is configured via options to gitlab_ide_extension
          // eid - represents uuid for each emitted event
          event.add('eid', eventId);
          event.add('p', 'app');
          event.add('tv', 'js-gitlab');
          event.add('tna', 'gl');
          event.add('aid', this.#options.appId);

          return preparePayload(event.build());
        }),
      };
      const config = {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };

      const response = await this.#lsFetch.post(url, config);
      if (response.status !== 200) {
        log.warn(
          `Could not send telemetry to snowplow, this warning can be safely ignored. status=${response.status}`,
        );
      }
    } catch (error) {
      let errorHandled = false;

      if (typeof error === 'object' && 'errno' in (error as object)) {
        const errObject = error as object;

        // ENOTFOUND occurs when the snowplow hostname cannot be resolved.
        if ('errno' in errObject && errObject.errno === 'ENOTFOUND') {
          this.#disabled = true;
          errorHandled = true;

          log.info('Disabling telemetry, unable to resolve endpoint address.');
        } else {
          log.warn(JSON.stringify(errObject));
        }
      }

      if (!errorHandled) {
        log.warn('Failed to send telemetry event, this warning can be safely ignored');
        log.warn(JSON.stringify(error));
      }
    }
  }
}

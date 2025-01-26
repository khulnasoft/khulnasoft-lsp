// FIXME: once we remove the default from ConfigService, we can move this back to the SnowplowTracker
import { ClientInfo, IdeInfo } from '../code_suggestions/code_suggestions_tracking_types';

export const DEFAULT_TRACKING_ENDPOINT = 'https://snowplowprd.trx.gitlab.net';
export const DEFAULT_SNOWPLOW_OPTIONS = {
  appId: 'gitlab_ide_extension',
  timeInterval: 5000,
  maxItems: 10,
};

export const EVENT_VALIDATION_ERROR_MSG = `Telemetry event context is not valid  - event won't be tracked.`;

export interface ISnowplowClientContext {
  schema: string;
  data: {
    ide_name?: string | null;
    ide_vendor?: string | null;
    ide_version?: string | null;
    extension_name?: string | null;
    extension_version?: string | null;
    language_server_version?: string | null;
  };
}
export interface IClientContext {
  ide?: IdeInfo;
  extension?: ClientInfo;
}

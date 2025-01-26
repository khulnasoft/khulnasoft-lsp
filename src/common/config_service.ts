import { EventEmitter } from 'events';
import { Disposable, WorkspaceFolder } from 'vscode-languageserver';
import { set, get, mergeWith, isArray } from 'lodash';
import { z } from 'zod';
import { Injectable, createInterfaceId } from '@khulnasoft/di';
import { LogLevel, LOG_LEVEL } from './log_types';
import type { TypedGetter, TypedSetter } from './utils/type_utils.d';
import { KHULNASOFT_API_BASE_URL } from './constants';
import type {
  ITelemetryOptions,
  ClientInfo,
} from './tracking/code_suggestions/code_suggestions_tracking_types';

export interface IChatConfig {
  enabled?: boolean;
}

export const CodeSuggestionsConfig = z.object({
  enabled: z.boolean().optional(),
  enableSecretRedaction: z.boolean().optional(),
  additionalLanguages: z.array(z.string()).optional(),
  disabledSupportedLanguages: z.array(z.string()).optional(),
});

export interface ISuggestionsCacheOptions {
  enabled?: boolean;
  maxSize?: number;
  ttl?: number;
  prefixLines?: number;
  suffixLines?: number;
}

export interface IHttpAgentOptions {
  ca?: string;
  cert?: string;
  certKey?: string;
}

export interface ISnowplowTrackerOptions {
  gitlab_instance_id?: string;
  gitlab_global_user_id?: string;
  gitlab_host_name?: string;
  gitlab_saas_duo_pro_namespace_ids?: number[];
}
export interface ISecurityScannerOptions {
  enabled?: boolean;
}

export interface IWorkflowSettings {
  dockerSocket?: string;
}

export interface IDuoConfig {
  enabledWithoutGitlabProject?: boolean;
}

// TODO: define this whole type as zod schema so that we can validate incoming config
export interface ClientConfig {
  /** KhulnaSoft API URL used for getting code suggestions */
  baseUrl?: string;
  /** Full project path. */
  projectPath?: string;
  /** PAT or OAuth token used to authenticate to KhulnaSoft API */
  token?: string;
  /** The base URL for language server assets in the client-side extension */
  baseAssetsUrl?: string;
  clientInfo?: ClientInfo;
  // FIXME: this key should be codeSuggestions (we have code completion and code generation)
  codeCompletion?: z.infer<typeof CodeSuggestionsConfig>;
  duoChat?: IChatConfig;
  openTabsContext?: boolean;
  telemetry?: ITelemetryOptions;
  /** Config used for caching code suggestions */
  suggestionsCache?: ISuggestionsCacheOptions;
  workspaceFolders?: WorkspaceFolder[] | null;
  /** Collection of Feature Flag values which are sent from the client */
  featureFlags?: Record<string, boolean>;
  logLevel?: LogLevel;
  ignoreCertificateErrors?: boolean;
  httpAgentOptions?: IHttpAgentOptions;
  snowplowTrackerOptions?: ISnowplowTrackerOptions;
  // TODO: move to `duo`
  duoWorkflowSettings?: IWorkflowSettings;
  securityScannerOptions?: ISecurityScannerOptions;
  duo?: IDuoConfig;
  featureFlagOverrides?: Record<string, boolean>;
}

export interface IConfig {
  // TODO: we can possibly remove this extra level of config and move all IClientConfig properties to IConfig
  client: ClientConfig;
}

/**
 * ConfigService manages user configuration (e.g. baseUrl) and application state (e.g. codeCompletion.enabled)
 * TODO: Maybe in the future we would like to separate these two
 */
export interface ConfigService {
  get: TypedGetter<IConfig>;
  /**
   * set sets the property of the config
   * the new value completely overrides the old one
   */
  set: TypedSetter<IConfig>;
  onConfigChange(listener: (config: IConfig) => void): Disposable;
  /**
   * merge adds `newConfig` properties into existing config, if the
   * property is present in both old and new config, `newConfig`
   * properties take precedence unless not defined
   *
   * This method performs deep merge
   *
   * **Arrays are not merged; they are replaced with the new value.**
   *
   */
  merge(newConfig: Partial<IConfig>): void;
}

export const ConfigService = createInterfaceId<ConfigService>('ConfigService');

@Injectable(ConfigService, [])
export class DefaultConfigService implements ConfigService {
  #config: IConfig;

  #eventEmitter = new EventEmitter();

  constructor() {
    this.#config = {
      client: {
        baseUrl: KHULNASOFT_API_BASE_URL,
        codeCompletion: {
          enableSecretRedaction: true,
        },
        telemetry: {
          enabled: true,
        },
        logLevel: LOG_LEVEL.INFO,
        ignoreCertificateErrors: false,
        httpAgentOptions: {},
        duo: {
          enabledWithoutGitlabProject: true,
        },
        featureFlagOverrides: {},
      },
    };
  }

  get: TypedGetter<IConfig> = (key?: string) => {
    return key ? get(this.#config, key) : this.#config;
  };

  set: TypedSetter<IConfig> = (key: string, value: unknown) => {
    set(this.#config, key, value);
    this.#triggerChange();
  };

  onConfigChange(listener: (config: IConfig) => void): Disposable {
    this.#eventEmitter.on('configChange', listener);
    return { dispose: () => this.#eventEmitter.removeListener('configChange', listener) };
  }

  #triggerChange() {
    this.#eventEmitter.emit('configChange', this.#config);
  }

  merge(newConfig: Partial<IConfig>) {
    mergeWith(this.#config, newConfig, (target, src) => (isArray(target) ? src : undefined));
    this.#triggerChange();
  }
}

export const exampleConfig: ClientConfig = {
  // TODO as we introduce validation for more properties, we should add them here
  codeCompletion: {
    enabled: true,
    enableSecretRedaction: true,
    additionalLanguages: ['clojure'],
    disabledSupportedLanguages: ['handlebars'],
  },
};

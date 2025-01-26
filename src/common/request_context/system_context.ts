import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { LogContext, logCtxItem } from '@khulnasoft/logging/src/log_context';
import { KhulnaSoftApiService, InstanceInfo } from '@khulnasoft/core';
import { ConfigService } from '../config_service';
import { version as lsVersion } from '../tracking/ls_info.json';
import { ClientInfo, IdeInfo } from '../tracking/code_suggestions/code_suggestions_tracking_types';

export interface SystemContext extends LogContext {
  ide?: IdeInfo;
  extension?: ClientInfo;
  lsVersion: string;
  instanceInfo?: InstanceInfo;
}

export const SystemContext = createInterfaceId<SystemContext>('SystemContext');

@Injectable(SystemContext, [ConfigService, KhulnaSoftApiService])
export class DefaultSystemContext implements SystemContext {
  #configService: ConfigService;

  #apiService: KhulnaSoftApiService;

  readonly lsVersion: string;

  constructor(configService: ConfigService, apiClient: KhulnaSoftApiService) {
    this.lsVersion = lsVersion;
    this.#configService = configService;
    this.#apiService = apiClient;
  }

  get ide() {
    return this.#configService.get('client.telemetry.ide');
  }

  get extension() {
    return this.#configService.get('client.telemetry.extension');
  }

  get instanceInfo() {
    return this.#apiService.instanceInfo;
  }

  readonly name = 'Systems';

  get children() {
    const ideInfo = this.ide
      ? `${this.ide.vendor} - ${this.ide.name} (${this.ide.version})`
      : 'N/A';
    const extensionInfo = this.extension
      ? `${this.extension.name} (${this.extension?.version ?? 'N/A'})`
      : 'N/A';
    const instanceInfo = this.instanceInfo
      ? `${this.instanceInfo.instanceUrl} (version: ${this.instanceInfo.instanceVersion})`
      : 'not connected';
    return [
      logCtxItem('IDE', ideInfo),
      logCtxItem('Extension', extensionInfo),
      logCtxItem('Language Server version', lsVersion),
      logCtxItem('KhulnaSoft Instance', instanceInfo),
    ];
  }
}

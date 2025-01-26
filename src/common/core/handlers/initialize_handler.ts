import {
  InitializeError,
  InitializeResult,
  RequestHandler,
  TextDocumentSyncKind,
} from 'vscode-languageserver-protocol';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { InitializeParams } from 'vscode-languageserver';
import { HandlesRequest } from '../../handler';
import { ConfigService } from '../../config_service';
import { IClientContext } from '../../tracking';
import { version as lsVersion } from '../../tracking/ls_info.json';

export type CustomInitializeParams = InitializeParams & {
  initializationOptions?: IClientContext;
};

export interface InitializeHandler
  extends HandlesRequest<CustomInitializeParams, InitializeResult, InitializeError> {}

export const InitializeHandler = createInterfaceId<InitializeHandler>('InitializeHandler');

@Injectable(InitializeHandler, [ConfigService])
export class DefaultInitializeHandler implements InitializeHandler {
  #configService: ConfigService;

  constructor(configService: ConfigService) {
    this.#configService = configService;
  }

  requestHandler: RequestHandler<CustomInitializeParams, InitializeResult, InitializeError> = (
    params: CustomInitializeParams,
  ): InitializeResult => {
    const { clientInfo, initializationOptions, workspaceFolders } = params;

    this.#configService.set('client.clientInfo', clientInfo);
    this.#configService.set('client.workspaceFolders', workspaceFolders);
    this.#configService.set('client.baseAssetsUrl', initializationOptions?.baseAssetsUrl);

    this.#configService.set('client.telemetry.ide', initializationOptions?.ide ?? clientInfo);
    this.#configService.set('client.telemetry.extension', initializationOptions?.extension);
    for (const [key, value] of Object.entries(initializationOptions?.featureFlagOverrides ?? {})) {
      this.#configService.set(`client.featureFlagOverrides.${key}`, value);
    }

    return {
      capabilities: {
        workspace: {
          workspaceFolders: {
            supported: true,
            changeNotifications: true,
          },
        },
        completionProvider: {
          resolveProvider: true,
        },
        inlineCompletionProvider: true,
        textDocumentSync: TextDocumentSyncKind.Full,
      },
      serverInfo: {
        name: 'KhulnaSoft Language Server',
        version: lsVersion,
      },
    };
  };
}

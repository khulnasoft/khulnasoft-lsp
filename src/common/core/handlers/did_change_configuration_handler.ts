import { NotificationHandler } from 'vscode-languageserver-protocol';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Logger, withPrefix } from '@khulnasoft/logging';
import { fromError } from 'zod-validation-error';
import { HandlesNotification } from '../../handler';
import {
  ConfigService,
  ClientConfig,
  CodeSuggestionsConfig,
  exampleConfig,
} from '../../config_service';
import { VirtualFileSystemService } from '../../services/fs/virtual_file_system_service';
import { DuoWorkspaceProjectAccessCache } from '../../services/duo_access';

export type ChangeConfigOptions = { settings: ClientConfig };

export interface DidChangeConfigurationHandler extends HandlesNotification<ChangeConfigOptions> {}

export const DidChangeConfigurationHandler = createInterfaceId<DidChangeConfigurationHandler>(
  'DidChangeConfigurationHandler',
);

@Injectable(DidChangeConfigurationHandler, [
  ConfigService,
  DuoWorkspaceProjectAccessCache,
  VirtualFileSystemService,
  Logger,
])
export class DefaultDidChangeConfigurationHandler implements DidChangeConfigurationHandler {
  #configService: ConfigService;

  #duoProjectAccessCache: DuoWorkspaceProjectAccessCache;

  #virtualFileSystemService: VirtualFileSystemService;

  #logger: Logger;

  constructor(
    configService: ConfigService,
    duoProjectAccessCache: DuoWorkspaceProjectAccessCache,
    virtualFileSystemService: VirtualFileSystemService,
    logger: Logger,
  ) {
    this.#configService = configService;
    this.#duoProjectAccessCache = duoProjectAccessCache;
    this.#virtualFileSystemService = virtualFileSystemService;
    this.#logger = withPrefix(logger, '[DidChangeConfiguration]');
  }

  notificationHandler: NotificationHandler<ChangeConfigOptions> = async (
    { settings }: ChangeConfigOptions = { settings: {} },
  ): Promise<void> => {
    const validationError = this.#validateConfig(settings);
    if (validationError) {
      this.#logger.error('The configuration is not valid and will be ignored', validationError);
      return;
    }
    this.#configService.merge({
      client: settings,
    });

    // FIXME: it's antipattern to react to config changes here. The following is a legacy code, DON'T add listeners here!!!
    // use ConfigService.onConfigChange event instead
    //
    // I tried to make the cache and the file system service listen on config changes but there is some race condition in CI (and only in CI)
    // that fails integration tests. You can see my failed attempt here https://github.com/khulnasoft/khulnasoft-lsp/-/merge_requests/969
    await Promise.all([
      this.#duoProjectAccessCache.updateCache({
        baseUrl: this.#configService.get('client.baseUrl') ?? '',
        workspaceFolders: this.#configService.get('client.workspaceFolders') ?? [],
      }),
      this.#virtualFileSystemService.setup(),
    ]);
  };

  #validateConfig(config: ClientConfig): Error | undefined {
    // TODO: validate more configuration than just the code suggestions config
    if (!config.codeCompletion) {
      return undefined;
    }
    const parsedCSConfig = CodeSuggestionsConfig.safeParse(config.codeCompletion);
    if (!parsedCSConfig.error) {
      return undefined;
    }
    const validationErrorMessage = fromError(parsedCSConfig.error, {
      prefix: 'settings.codeCompletion',
    }).message;
    const originalConfig = JSON.stringify(config.codeCompletion);
    const validFormatExample = JSON.stringify(exampleConfig.codeCompletion);

    return new Error(
      `Validation error: ${validationErrorMessage}\nConfig received ${originalConfig}\nExample of a correct format: ${validFormatExample}`,
    );
  }
}

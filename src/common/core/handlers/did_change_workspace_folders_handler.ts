import {
  NotificationHandler,
  DidChangeWorkspaceFoldersParams,
} from 'vscode-languageserver-protocol';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { Logger, withPrefix } from '@khulnasoft/logging';
import { HandlesNotification } from '../../handler';
import { ConfigService } from '../../config_service';

export interface DidChangeWorkspaceFoldersHandler
  extends HandlesNotification<DidChangeWorkspaceFoldersParams> {}

export const DidChangeWorkspaceFoldersHandler = createInterfaceId<DidChangeWorkspaceFoldersHandler>(
  'DidChangeWorkspaceFoldersHandler',
);

@Injectable(DidChangeWorkspaceFoldersHandler, [ConfigService, Logger])
export class DefaultDidChangeWorkspaceFoldersHandler implements DidChangeWorkspaceFoldersHandler {
  #configService: ConfigService;

  #logger: Logger;

  constructor(configService: ConfigService, logger: Logger) {
    this.#configService = configService;
    this.#logger = withPrefix(logger, '[DidChangeWorkspaceFoldersHandler]');
  }

  notificationHandler: NotificationHandler<DidChangeWorkspaceFoldersParams> = (
    params: DidChangeWorkspaceFoldersParams,
  ): void => {
    const { added, removed } = params.event;

    this.#logger.debug(`Workspace folders have changed: ${JSON.stringify(params)}`);

    const removedKeys = removed.map(({ name }) => name);

    const currentWorkspaceFolders = this.#configService.get('client.workspaceFolders') || [];
    const afterRemoved = currentWorkspaceFolders.filter((f) => !removedKeys.includes(f.name));
    const afterAdded = [...afterRemoved, ...(added || [])];

    this.#configService.set('client.workspaceFolders', afterAdded);
  };
}

import { Connection } from 'vscode-languageserver';
import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ClientFeatureFlags, FeatureFlagService } from './feature_flags';
import { log } from './log';
import {
  SendWorkflowEventNotificationParams,
  StartWorkflowNotificationParams,
} from './notifications';
import { LsConnection } from './external_interfaces';

export const WORKFLOW_MESSAGE_NOTIFICATION = '$/gitlab/workflowMessage';

// FIXME: Move this whole file into the workflow package
export interface WorkflowHandler {
  startWorkflowNotificationHandler: (p: StartWorkflowNotificationParams) => void;
  sendWorkflowEventHandler: (p: SendWorkflowEventNotificationParams) => void;
}

export const WorkflowHandler = createInterfaceId<WorkflowHandler>('WorkflowHandler');

@Injectable(WorkflowHandler, [LsConnection, FeatureFlagService, WorkflowAPI])
export class DefaultWorkflowHandler implements WorkflowHandler {
  #connection: Connection;

  #featureFlagService: FeatureFlagService;

  #workflowAPI: WorkflowAPI | undefined;

  constructor(
    connection: LsConnection,
    featureFlagService: FeatureFlagService,
    workflowAPI: WorkflowAPI,
  ) {
    this.#connection = connection;
    this.#featureFlagService = featureFlagService;
    this.#workflowAPI = workflowAPI;
  }

  async #sendWorkflowErrorNotification(message: string) {
    // FIXME: This is antipattern, don't access connection outside of the ConnectionService
    // the best way to handle this is to accept notification function here and use that
    // see https://github.com/khulnasoft/khulnasoft-lsp/blob/f1b1b578a3af26d14a4b1e6b0c0113b3671aa075/src/common/connection_service.ts#L119 for how to implement this
    await this.#connection.sendNotification(WORKFLOW_MESSAGE_NOTIFICATION, {
      message,
      type: 'error',
    });
  }

  startWorkflowNotificationHandler = async ({ goal, image }: StartWorkflowNotificationParams) => {
    const duoWorkflow = this.#featureFlagService.isClientFlagEnabled(
      ClientFeatureFlags.DuoWorkflow,
    );
    if (!duoWorkflow) {
      await this.#sendWorkflowErrorNotification(`The Duo Workflow feature is not enabled`);
      return;
    }

    if (!this.#workflowAPI) {
      await this.#sendWorkflowErrorNotification('Workflow API is not configured for the LSP');
      return;
    }

    try {
      await this.#workflowAPI?.runWorkflow(goal, image);
    } catch (e) {
      log.error('Error in running workflow', e);
      await this.#sendWorkflowErrorNotification(`Error occurred while running workflow ${e}`);
    }
  };

  sendWorkflowEventHandler = async ({
    workflowID,
    eventType,
    message,
  }: SendWorkflowEventNotificationParams) => {
    const duoWorkflow = this.#featureFlagService.isClientFlagEnabled(
      ClientFeatureFlags.DuoWorkflow,
    );
    if (!duoWorkflow) {
      await this.#sendWorkflowErrorNotification(`The Duo Workflow feature is not enabled`);
      return;
    }

    try {
      await this.#workflowAPI?.sendEvent(workflowID, eventType, message);
    } catch (e) {
      log.error('Error in running workflow', e);
      await this.#sendWorkflowErrorNotification(`Error occurred while sending event ${e}`);
    }
  };
}

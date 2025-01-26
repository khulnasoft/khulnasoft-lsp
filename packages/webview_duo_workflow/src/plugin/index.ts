import { DuoWorkflowEvent, ParsedDuoWorkflowEvent } from '@khulnasoft/webview-duo-workflow';
import { Connection } from 'vscode-languageserver';
import { MessageBus } from '@khulnasoft/message-bus';
import { WebviewPlugin } from '@khulnasoft/webview-plugin';
import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import { DuoWorkflowMessages, WEBVIEW_ID, WEBVIEW_TITLE } from '../contract';
import type { DuoWorkflowInitialState } from '../contract';
import {
  initWorkflowController,
  initWorkflowConnectionController,
  initWorkflowCommonController,
  registerControllers,
} from './controllers';
import { parseLangGraphCheckpoint } from './utils';

export const workflowPluginFactory = (
  workflowApi: WorkflowAPI,
  connection: Connection,
): WebviewPlugin<DuoWorkflowMessages> => {
  return {
    id: WEBVIEW_ID,
    title: WEBVIEW_TITLE,
    setup: ({ webview, extension }) => {
      let initialStateCache: DuoWorkflowInitialState = {};

      extension.onNotification('setInitialState', (initialState: DuoWorkflowInitialState) => {
        initialStateCache = initialState;
      });

      webview.onInstanceConnected((_webviewInstanceId, messageBus: MessageBus) => {
        const workflowSubscriptionCallback = async (message: DuoWorkflowEvent) => {
          const checkpoint = parseLangGraphCheckpoint(message.checkpoint);
          const parsedCheckpoint: ParsedDuoWorkflowEvent = { ...message, checkpoint };

          messageBus.sendNotification('workflowCheckpoint', parsedCheckpoint);
          messageBus.sendNotification('workflowStatus', message.workflowStatus);
        };

        messageBus.onNotification('appReady', () => {
          messageBus.sendNotification('initialState', initialStateCache);
          // This is so that when we close and reopen a Duo Workflow tab,
          // it always start with a fresh cache
          initialStateCache = {};
        });

        const workflowCommon = initWorkflowCommonController(workflowApi);
        const workflowConnection = initWorkflowConnectionController(connection);
        const workflow = initWorkflowController(workflowApi, workflowSubscriptionCallback);

        registerControllers(messageBus, [
          workflow.startWorkflow,
          workflow.getWorkflowById,
          workflow.sendWorkflowEvent,
          workflow.stopSubscriptions,
          workflowCommon.getGraphqlData,
          workflowCommon.getProjectPath,
          workflowCommon.pullDockerImage,
          workflowCommon.verifyDockerImage,
          workflowConnection.openUrl,
        ]);
      });
    },
  };
};

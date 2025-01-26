import {
  CreateWebviewMessages,
  WebviewConnection,
  WebviewInstanceId,
} from '@khulnasoft/webview-plugin';

import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import { MessageBus } from '@khulnasoft/message-bus';
import { Connection } from 'vscode-languageserver';
import { DuoWorkflowMessages } from '../contract';

export type WebviewMessageMap = CreateWebviewMessages<{
  fromWebview: DuoWorkflowMessages['webviewToPlugin'];
  toWebview: DuoWorkflowMessages['pluginToWebview'];
}>;
export type ExtensionMessageMap = {
  inbound: DuoWorkflowMessages['extensionToPlugin'];
  outbound: DuoWorkflowMessages['pluginToExtension'];
};

const workflowController = {
  startWorkflow: jest.fn(),
  getWorkflowById: jest.fn(),
  sendWorkflowEvent: jest.fn(),
  stopSubscriptions: jest.fn(),
};
const workflowCommonController = {
  checkHealth: jest.fn(),
  getGraphqlData: jest.fn(),
  getProjectPath: jest.fn(),
  pullDockerImage: jest.fn(),
  verifyDockerImage: jest.fn(),
};
const workflowConnectionController = {
  openUrl: jest.fn(),
};
const webviewInstanceId = 'someInstanceId' as WebviewInstanceId;

const workflowApi = {
  subscribeToWorkflow: jest.fn(),
  unsubscribeFromWorkflow: jest.fn(),
} as unknown as jest.Mocked<WorkflowAPI>;

const connection = {} as jest.Mocked<Connection>;

const webview = {
  broadcast: jest.fn(),
  onInstanceConnected: jest.fn(),
} as jest.Mocked<WebviewConnection<WebviewMessageMap>>;

const extension = {
  onNotification: jest.fn(),
} as unknown as jest.Mocked<MessageBus<ExtensionMessageMap>>;

const messageBus = {
  sendNotification: jest.fn(),
  onNotification: jest.fn(),
} as unknown as jest.Mocked<
  MessageBus<{
    inbound: WebviewMessageMap['fromWebview'];
    outbound: WebviewMessageMap['toWebview'];
  }>
>;

export default {
  workflowApi,
  connection,
  webview,
  extension,
  messageBus,
  workflowController,
  workflowCommonController,
  workflowConnectionController,
  webviewInstanceId,
};

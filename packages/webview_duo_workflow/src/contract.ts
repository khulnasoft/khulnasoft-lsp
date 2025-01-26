import { CreatePluginMessageMap, WebviewId } from '@khulnasoft/webview-plugin';
import { WorkflowGraphqlPayloadClient } from './plugin/controllers/types';
import {
  ParsedDuoWorkflowEvent,
  DuoWorkflowInfo,
  DuoWorkflowStatus,
  ProjectInfo,
  HealthCheckData,
} from './types';
import { WorkflowEvent } from './common/duo_workflow_events';

export const WEBVIEW_ID = 'duo-workflow' as WebviewId;
export const WEBVIEW_TITLE = 'KhulnaSoft Duo Workflow';

export type DuoWorkflowInitialState = Record<string, unknown>;

export type getWorkflowsParams = { projectPath: string; startCursor?: string; endCursor?: string };

export type DuoWorkflowMessages = CreatePluginMessageMap<{
  extensionToPlugin: {
    notifications: {
      setInitialState: DuoWorkflowInitialState;
    };
  };
  webviewToPlugin: {
    notifications: {
      appReady: undefined;
      checkHealth: { projectPath: string };
      getGraphqlData: WorkflowGraphqlPayloadClient;
      getProjectPath: null;
      getUserWorkflows: getWorkflowsParams;
      getWorkflowById: {
        workflowId: string;
      };
      pullDockerImage: string;
      stopSubscriptions: null;
      startWorkflow: {
        goal: string;
        image: string;
      };
      sendWorkflowEvent: {
        eventType: WorkflowEvent;
        workflowId: string;
        message?: string;
      };
      verifyDockerImage: string;
      openUrl: {
        url: string;
      };
    };
  };
  pluginToWebview: {
    notifications: {
      setHealthChecks: HealthCheckData;
      isDockerImageAvailable: boolean;
      initialState: DuoWorkflowInitialState;
      pullDockerImageCompleted: {
        message: string;
      };
      dockerConfigured: boolean;
      setProjectPath: string;
      updateProjects: ProjectInfo[];
      updateWorkflows: DuoWorkflowInfo[];
      workflowCheckpoint: ParsedDuoWorkflowEvent;
      workflowError: string;
      workflowGoal: string;
      workflowStarted: string;
      workflowStatus: DuoWorkflowStatus;
    };
  };
}>;

export type WebviewToPluginNotification =
  keyof DuoWorkflowMessages['webviewToPlugin']['notifications'];

export type PluginToWebviewNotification =
  keyof DuoWorkflowMessages['pluginToWebview']['notifications'];

import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import { ControllerResponse, ControllerData, WorkflowGraphqlPayloadClient } from './types';

export const initWorkflowCommonController = (workflowApi: WorkflowAPI) => {
  return {
    async getGraphqlData({
      eventName,
      query,
      variables,
      supportedSinceInstanceVersion,
    }: WorkflowGraphqlPayloadClient): Promise<ControllerResponse> {
      try {
        const response = await workflowApi.getGraphqlData({
          query,
          variables,
          supportedSinceInstanceVersion,
        });

        return {
          eventName,
          data: response,
        };
      } catch (e) {
        const error = e as Error;

        return {
          eventName: 'workflowError',
          data: error.message,
        };
      }
    },

    async getProjectPath(): Promise<ControllerResponse> {
      return {
        eventName: 'setProjectPath',
        data: await workflowApi.getProjectPath(),
      };
    },

    async pullDockerImage(image: string): Promise<ControllerResponse> {
      try {
        await workflowApi.pullDockerImage(image);
        return {
          eventName: 'pullDockerImageCompleted',
          data: {
            success: true,
          },
        };
      } catch {
        return {
          eventName: 'pullDockerImageCompleted',
          data: {
            success: false,
          },
        };
      }
    },
    async verifyDockerImage(image: string): Promise<ControllerData> {
      try {
        const isAvailable = await workflowApi.isDockerImageAvailable(image);

        return [
          { eventName: 'dockerConfigured', data: true },
          {
            eventName: 'isDockerImageAvailable',
            data: isAvailable,
          },
        ];
      } catch (e) {
        const error = e as NodeJS.ErrnoException;
        if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
          return {
            eventName: 'dockerConfigured',
            data: false,
          };
        }
        return {
          eventName: 'workflowError',
          data: error.message,
        };
      }
    },
  };
};

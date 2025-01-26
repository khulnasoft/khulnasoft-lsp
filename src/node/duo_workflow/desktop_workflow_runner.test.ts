import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { Cable } from '@anycable/core';
import {
  DuoWorkflowStatus,
  DuoWorkflowEvent,
  WorkflowEvent,
} from '@khulnasoft/webview-duo-workflow';
import { ConfigService, DefaultConfigService, KhulnaSoftAPI } from '../../common';
import { LsFetch } from '../../common/fetch';
import { log } from '../../common/log';
import { createFakePartial } from '../../common/test_utils/create_fake_partial';
import { DesktopWorkflowRunner, GenerateTokenResponse } from './desktop_workflow_runner';
import { WorkflowEventsChannel } from './api/graphql/workflow_events_response_channel';
import { TimeoutError } from './timeout_error';

jest.spyOn(log, 'error').mockImplementation(() => {});

jest.mock('fs/promises');
jest.mock('path');
const mockDockerMakeRequest = jest.fn();

jest.mock('./docker_client', () => ({
  DockerClient: jest.fn(() => ({ makeRequest: mockDockerMakeRequest })),
}));

const createFakeCable = () =>
  createFakePartial<Cable>({
    subscribe: jest.fn(),
    disconnect: jest.fn(),
  });

describe('DesktopWorkflowAPI', () => {
  let api: DesktopWorkflowRunner;
  let configService: ConfigService;
  let cable: Cable;

  const mockReadFile = readFile as jest.Mock;
  const mockWriteFile = writeFile as jest.Mock;
  const mockPathJoin = path.join as jest.Mock;
  const fetch = jest.fn();
  const lsFetch: LsFetch = createFakePartial<LsFetch>({ fetch, updateAgentOptions: jest.fn() });
  const mockFetchFromApi = jest.fn();
  const gitlabAPI = createFakePartial<KhulnaSoftAPI>({
    fetchFromApi: mockFetchFromApi,
    connectToCable: async () => cable,
  });

  const generateTokenResponse: GenerateTokenResponse = {
    gitlab_rails: {
      base_url: 'https://my.gitlab.com',
      token: 'gitlab-rails-token',
    },
    duo_workflow_executor: {
      executor_binary_url: 'https://duo-workflow-executor.example.com',
      version: 'v0.0.6',
    },
    duo_workflow_service: {
      base_url: 'workflow-service-url:443',
      token: 'workflow-service-token',
      secure: true,
      headers: {
        'X-Gitlab-Host-Name': 'host-name',
        'X-Gitlab-Instance-Id': 'instance-id',
        'X-Gitlab-Realm': 'realm',
        'X-Gitlab-Version': 'version',
        'X-Gitlab-Global-User-Id': 'global-user-id',
      },
    },
  };

  beforeEach(() => {
    cable = createFakeCable();
    configService = new DefaultConfigService();
    api = new DesktopWorkflowRunner(configService, lsFetch, gitlabAPI);
    configService.set('client.token', '123');
    configService.set('client.baseUrl', 'https://my.gitlab.com');
    configService.set('client.duoWorkflowSettings.dockerSocket', '/host');
    configService.set('client.workspaceFolders', [
      {
        uri: 'file:///Users/test/projects/LSP',
        name: 'LSP',
      },
    ]);
    configService.set('client.projectPath', 'mynamespace/myproject');
    configService.set('client.telemetry.enabled', true);
    mockPathJoin.mockReturnValue('/path/to/executor.tar');

    mockReadFile.mockResolvedValue(Buffer.from('file contents'));
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });

    mockFetchFromApi.mockResolvedValue({
      id: 'workflow-id',
    });

    mockFetchFromApi.mockResolvedValue(generateTokenResponse);
  });

  describe('executorCommand', () => {
    it('constructs a valid executor command', () => {
      const command = api.executorCommand('123', generateTokenResponse, 'Say hello', 'info');
      expect(command).toEqual([
        '/duo-workflow-executor',
        '--workflow-id=123',
        '--server',
        'workflow-service-url:443',
        '--goal',
        'Say hello',
        '--base-url',
        'https://my.gitlab.com',
        '--token',
        'gitlab-rails-token',
        '--duo-workflow-service-token',
        'workflow-service-token',
        '--realm',
        'realm',
        '--user-id',
        'global-user-id',
        '--instance-id',
        'instance-id',
        '--git-http-base-url',
        'https://my.gitlab.com',
        '--git-http-user',
        'auth',
        '--git-password',
        'gitlab-rails-token',
        '--ignore-git-dir-owners',
        '--telemetry-enabled',
      ]);
    });

    it('includes --insecure when secure: false', () => {
      const tokenResponse = {
        ...generateTokenResponse,
        duo_workflow_service: {
          ...generateTokenResponse.duo_workflow_service,
          secure: false,
        },
      };

      const command = api.executorCommand('123', tokenResponse, 'Say hello', 'info');
      expect(command).toContain('--insecure');
    });

    it('includes --debug when logLevel is debug', () => {
      const command = api.executorCommand('123', generateTokenResponse, 'Say hello', 'debug');
      expect(command).toContain('--debug');
    });

    it('includes --workflow-metadata when workflow_metadata is set', () => {
      const tokenResponse = {
        ...generateTokenResponse,
        workflow_metadata: { someMetadata: 'some value' },
      };

      const command = api.executorCommand('123', tokenResponse, 'Say hello', 'info');
      expect(command).toContain('--workflow-metadata');
      expect(command).toContain('{"someMetadata":"some value"}');
    });
  });

  describe('isDockerImageAvailable', () => {
    it('should return true when the image exists', async () => {
      mockDockerMakeRequest.mockResolvedValueOnce(
        JSON.stringify([{ RepoTags: ['existing-image:latest'] }]),
      );

      const result = await api.isDockerImageAvailable('existing-image:latest');

      expect(result).toBe(true);
      expect(mockDockerMakeRequest).toHaveBeenCalledWith('/v1.43/images/json', 'GET', '');
    });

    it('should return false when the image does not exist', async () => {
      mockDockerMakeRequest.mockResolvedValueOnce(
        JSON.stringify([{ RepoTags: ['other-image:latest'] }]),
      );

      const result = await api.isDockerImageAvailable('non-existing-image:latest');

      expect(result).toBe(false);
      expect(mockDockerMakeRequest).toHaveBeenCalledWith('/v1.43/images/json', 'GET', '');
    });
  });

  describe('pullDockerImage', () => {
    it('should pull the specified image', async () => {
      const imageName = 'new-image:latest';
      mockDockerMakeRequest.mockResolvedValueOnce('');

      await api.pullDockerImage(imageName);

      expect(mockDockerMakeRequest).toHaveBeenCalledWith(
        `/v1.43/images/create?fromImage=${imageName}`,
        'POST',
        '',
        'text/plain',
        300000,
      );
    });

    it('should throw an error if pulling the image fails', async () => {
      const imageName = 'failing-image:latest';
      mockDockerMakeRequest.mockRejectedValueOnce(new Error('Pull failed'));

      await expect(api.pullDockerImage(imageName)).rejects.toThrow('Pull failed');
    });
  });

  describe('runWorkflow', () => {
    describe('when correctly configured', () => {
      beforeEach(() => {
        mockFetchFromApi.mockResolvedValueOnce({
          id: 'workflow-id',
        });

        mockFetchFromApi.mockResolvedValueOnce(generateTokenResponse);

        const existingImage = 'test-image:latest';

        mockDockerMakeRequest.mockImplementation((apiPath: string) => {
          if (apiPath.includes('/v1.43/containers/create')) {
            return JSON.stringify({ Id: 'created-container-id' });
          }
          if (apiPath.includes('/v1.43/images/json')) {
            return JSON.stringify([{ RepoTags: [existingImage] }]);
          }
          if (apiPath.includes('/v1.43/images/create')) {
            return '';
          }
          if (apiPath.includes('/v1.43/containers/start')) {
            return '';
          }
          if (apiPath.includes('/v1.43/containers/archive')) {
            return '';
          }
          throw new Error(`Unexpected Docker API call: ${apiPath}`);
        });
      });

      it('runWorkflow should successfully run a workflow', async () => {
        mockReadFile.mockResolvedValue(Buffer.from('file contents'));
        mockPathJoin.mockReturnValue('/path/to/executor.tar');

        await api.runWorkflow('test-goal', 'test-image:latest');

        expect(mockDockerMakeRequest).toHaveBeenCalledTimes(3);
        expect(mockReadFile).toHaveBeenCalledWith('/path/to/executor.tar');
        expect(mockFetchFromApi).toHaveBeenCalledWith({
          body: { project_id: 'mynamespace/myproject', goal: 'test-goal' },
          method: 'POST',
          path: '/ai/duo_workflows/workflows',
          supportedSinceInstanceVersion: {
            resourceName: 'create a workflow',
            version: '17.3.0',
          },
          type: 'rest',
        });
      });

      it('runWorkflow does not download executor file when file is already present', async () => {
        mockReadFile.mockResolvedValue(Buffer.from('file contents'));
        mockPathJoin.mockReturnValue('/path/to/executor.tar');

        await api.runWorkflow('test-goal', 'test-image');
        expect(mockFetchFromApi).toHaveBeenCalledWith({
          body: { project_id: 'mynamespace/myproject', goal: 'test-goal' },
          method: 'POST',
          path: '/ai/duo_workflows/workflows',
          supportedSinceInstanceVersion: {
            resourceName: 'create a workflow',
            version: '17.3.0',
          },
          type: 'rest',
        });
      });

      describe('when file is not present', () => {
        beforeEach(() => {
          mockReadFile.mockImplementationOnce(() => {
            throw new Error('File not found');
          });
        });

        it('runWorkflow downloads executor file ', async () => {
          await api.runWorkflow('test-goal', 'test-image');

          expect(fetch).toHaveBeenCalledWith('https://duo-workflow-executor.example.com', {
            method: 'GET',
          });
          expect(mockWriteFile).toHaveBeenCalledWith(
            '/path/to/executor.tar',
            Buffer.from([1, 2, 3]),
          );
        });
      });
    });

    describe('when not correctly configured throws errors', () => {
      it('should handle Docker socket not set', async () => {
        configService.set('client.duoWorkflowSettings.dockerSocket', undefined);
        await expect(api.runWorkflow('test-goal', 'test-image')).rejects.toThrow(
          'Docker socket not configured',
        );
      });
    });
  });

  describe('subscribeToUpdates', () => {
    describe('when #cable is already defined', () => {
      it('should disconnect existing cable', async () => {
        await api.subscribeToUpdates(jest.fn(), '123');
        await api.subscribeToUpdates(jest.fn(), '456');

        expect(cable.subscribe).toHaveBeenCalledTimes(2);
        expect(cable.disconnect).toHaveBeenCalled();
      });
    });

    describe('when a #cable is not yet defined', () => {
      let messageCallback: jest.Mock;
      let workflowId: string;

      beforeEach(async () => {
        messageCallback = jest.fn();
        workflowId = 'workflow-id';
        await api.subscribeToUpdates(messageCallback, workflowId);
      });

      it('should not call disconnect #cable', async () => {
        expect(cable.disconnect).not.toHaveBeenCalled();
      });
    });

    it('calls messageCallback on checkpoint', async () => {
      const status = DuoWorkflowStatus.FINISHED;
      const workflowEvent: DuoWorkflowEvent = {
        checkpoint: `{ "channel_values": { "status": "${status}" }}`,
        metadata: 'new metadata',
        workflowStatus: status,
        errors: [],
        workflowGoal: '',
      };
      const workflowId = '1';
      const messageCallback = jest.fn();

      await api.subscribeToUpdates(messageCallback, workflowId);

      expect(cable.subscribe).toHaveBeenCalledWith(expect.any(WorkflowEventsChannel));
      const channel = jest.mocked(cable.subscribe).mock.calls[0][0];

      channel.receive({ result: { data: { workflowEventsUpdated: workflowEvent } }, more: true });

      expect(messageCallback).toHaveBeenCalledWith(workflowEvent);
      expect(cable.disconnect).toHaveBeenCalled();
    });
  });

  describe('sendEvent', () => {
    const expectedParams = {
      body: {
        event_type: 'stop',
        message: '',
      },
      method: 'POST',
      path: '/ai/duo_workflows/workflows/1/events',
      supportedSinceInstanceVersion: {
        resourceName: 'create a workflow event',
        version: '17.5.0',
      },
      type: 'rest',
    };

    beforeEach(() => {
      mockFetchFromApi.mockResolvedValueOnce({
        id: '1',
      });
    });

    describe('when message is not passed', () => {
      it('sends the request to events endpoint with a blank message', async () => {
        await api.sendEvent('1', WorkflowEvent.STOP);
        expect(mockFetchFromApi).toHaveBeenCalledWith(expectedParams);
      });
    });

    describe('when message is not passed', () => {
      it('sends the request to events endpoint with the passed in message', async () => {
        await api.sendEvent('1', WorkflowEvent.MESSAGE, 'test message');

        expect(mockFetchFromApi).toHaveBeenCalledWith({
          ...expectedParams,
          body: {
            event_type: 'message',
            message: 'test message',
          },
        });
      });
    });
  });

  describe('getGraphqlData', () => {
    const testQuery = 'query { property { value } }';

    describe('when there is data to return', () => {
      beforeEach(() => {
        mockFetchFromApi.mockResolvedValue({
          data: {
            property: {
              value: 'nestedValue',
            },
          },
        });
      });

      it('calls fetchFromApi with the right data', async () => {
        await api.getGraphqlData({
          query: testQuery,
          variables: { userId: 1 },
          supportedSinceInstanceVersion: {
            version: '17.7',
            resourceName: 'test',
          },
        });

        expect(gitlabAPI.fetchFromApi).toHaveBeenCalledWith({
          supportedSinceInstanceVersion: { version: '17.7', resourceName: 'test' },
          query: testQuery,
          variables: { userId: 1 },
          type: 'graphql',
        });
      });
    });

    describe('when there is no data', () => {
      beforeEach(() => {
        mockFetchFromApi.mockResolvedValue({
          data: {
            property: null,
          },
        });
      });

      it('returns resolved value', async () => {
        const result = await api.getGraphqlData({
          query: testQuery,
          variables: { userId: 1 },
        });

        expect(result).toEqual({
          data: {
            property: null,
          },
        });
      });
    });

    describe('when there is an error', () => {
      beforeEach(() => {
        mockFetchFromApi.mockRejectedValue(new Error('test error'));
      });

      it('throws and logs the error', async () => {
        await expect(
          api.getGraphqlData({
            query: testQuery,
            variables: { userId: 1 },
          }),
        ).rejects.toThrow('test error');

        expect(log.error).toHaveBeenCalledWith('test error');
      });
    });
  });

  describe('watchWorkflowExecutor', () => {
    it('continues to wait for execution to end when a timeout is received', async () => {
      const waitHandler = jest
        .fn()
        .mockRejectedValueOnce(new TimeoutError())
        .mockResolvedValueOnce(JSON.stringify({ StatusCode: 0 }));
      mockDockerMakeRequest.mockImplementation((apiPath: string) => {
        if (apiPath.includes('/create')) {
          return JSON.stringify({ Id: 'container-id' });
        }
        if (apiPath.includes('/start')) {
          return '';
        }
        if (apiPath.includes('/archive')) {
          return '';
        }
        if (apiPath.includes('/wait')) {
          return waitHandler();
        }
        throw new Error(`Unexpected Docker API call: ${apiPath}`);
      });

      await api.runWorkflow('test', 'test');
      mockDockerMakeRequest.mockClear();
      await api.watchWorkflowExecutor();

      expect(mockDockerMakeRequest).toHaveBeenCalledTimes(2);
      expect(mockDockerMakeRequest).toHaveBeenLastCalledWith(
        `/v1.43/containers/container-id/wait`,
        'POST',
        '',
        'application/json',
        300000,
      );
    });
  });
});

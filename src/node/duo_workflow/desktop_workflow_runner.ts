import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { WorkflowAPI, WorkflowGraphqlPayload } from '@khulnasoft-lsp/workflow-api';
import {
  DuoWorkflowStatus,
  DuoWorkflowEvent,
  WorkflowEvent,
  DuoWorkflowStatusUpdate,
  DuoWorkflowStatusUpdateResponse,
} from '@khulnasoft/webview-duo-workflow';
import { Injectable } from '@khulnasoft/di';
import { Cable } from '@anycable/core';
import { ConfigService, IConfig } from '../../common';
import { LsFetch } from '../../common/fetch';
import { log } from '../../common/log';
import { KhulnaSoftApiClient } from '../../common/api';
import { LogLevel, LOG_LEVEL } from '../../common/log_types';
import { WorkflowEventsChannel } from './api/graphql/workflow_events_response_channel';
import { DockerClient } from './docker_client';
import { TimeoutError } from './timeout_error';

export interface GenerateTokenResponse {
  gitlab_rails: {
    base_url: string;
    token: string;
  };
  duo_workflow_executor: {
    executor_binary_url: string;
    version: string;
  };
  duo_workflow_service: {
    base_url: string;
    token: string;
    secure: boolean;
    headers: {
      'X-Gitlab-Host-Name': string;
      'X-Gitlab-Instance-Id': string;
      'X-Gitlab-Realm': string;
      'X-Gitlab-Version': string;
      'X-Gitlab-Global-User-Id': string;
    };
  };
  workflow_metadata?: object;
}

interface CreateWorkflowResponse {
  id: string;
}

interface CreateWorkflowEventResponse {
  id: string;
  event_type: string;
  event_status: string;
  message: string;
}

@Injectable(WorkflowAPI, [ConfigService, LsFetch, KhulnaSoftApiClient])
// FIXME: this class should either be called DesktopWorkflowAPI or the interface should be called WorkflowRunner
export class DesktopWorkflowRunner implements WorkflowAPI {
  #cable: Cable | undefined;

  #dockerSocket?: string;

  #dockerClient?: DockerClient;

  #folders?: WorkspaceFolder[];

  #fetch: LsFetch;

  #api: KhulnaSoftApiClient;

  #projectPath: string | undefined;

  #logLevel: LogLevel | undefined;

  #container: { Id: string } | null;

  #telemetryEnabled: boolean;

  constructor(configService: ConfigService, fetch: LsFetch, api: KhulnaSoftApiClient) {
    this.#fetch = fetch;
    this.#api = api;
    this.#container = null;
    this.#telemetryEnabled = configService.get('client.telemetry.enabled') ?? true;
    configService.onConfigChange((config) => this.#reconfigure(config));
  }

  #reconfigure(config: IConfig) {
    this.#dockerSocket = config.client.duoWorkflowSettings?.dockerSocket;
    if (this.#dockerSocket) {
      this.#dockerClient = new DockerClient(this.#dockerSocket);
    } else {
      // Set it back to undefined to get errors
      this.#dockerClient = undefined;
    }
    this.#folders = config.client.workspaceFolders || [];
    this.#projectPath = config.client.projectPath;
    this.#logLevel = config.client.logLevel;
    const telemetryEnabled = config.client.telemetry?.enabled;
    if (typeof telemetryEnabled !== 'undefined' && this.#telemetryEnabled !== telemetryEnabled) {
      this.#telemetryEnabled = telemetryEnabled;
    }
  }

  getProjectPath() {
    return this.#projectPath || '';
  }

  async subscribeToUpdates(
    messageCallback: (message: DuoWorkflowEvent) => void,
    workflowId: string,
  ) {
    if (this.#cable) {
      this.disconnectCable();
    }

    const channel = new WorkflowEventsChannel({
      workflowId: `gid://gitlab/Ai::DuoWorkflows::Workflow/${workflowId}`,
    });

    this.#cable = await this.#api.connectToCable();

    channel.on('checkpoint', async (msg) => {
      if (msg.workflowStatus === DuoWorkflowStatus.FINISHED) {
        this.disconnectCable();
      }
      await messageCallback(msg);
    });

    this.#cable.subscribe(channel);
  }

  disconnectCable() {
    if (this.#cable) {
      this.#cable.disconnect();
    }
  }

  async runWorkflow(goal: string, image: string): Promise<string> {
    if (!this.#dockerClient) {
      throw new Error('Docker socket not configured');
    }

    if (!this.#folders || this.#folders.length === 0) {
      throw new Error('No workspace folders');
    }

    const folderName = this.#folders[0].uri.replace(/^file:\/\//, '');

    if (this.#folders.length > 0) {
      log.info(`More than one workspace folder detected. Using workspace folder ${folderName}`);
    }

    const workflowId = await this.#createWorkflow(goal);
    const workflowToken = await this.#getWorkflowToken();

    const executorVersion = workflowToken.duo_workflow_executor.version;
    const executorPath = path.join(
      __dirname,
      `../vendor/duo-workflow-executor-${executorVersion}.tar.gz`,
    );

    await this.#downloadWorkflowExecutor(
      workflowToken.duo_workflow_executor.executor_binary_url,
      executorPath,
    );

    const containerOptions = {
      Image: image,
      Cmd: this.executorCommand(workflowId, workflowToken, goal, this.#logLevel),
      HostConfig: {
        Binds: [`${folderName}:/workspace`],
      },
    };

    // Create a container
    this.#container = JSON.parse(
      await this.#dockerClient.makeRequest(
        '/v1.43/containers/create',
        'POST',
        JSON.stringify(containerOptions),
      ),
    );

    // Check if Id in createResponse
    if (!this.#container?.Id) {
      throw new Error('Failed to create container: No Id in response');
    }

    const containerID = this.#container.Id;

    log.info(`Created the docker container: ${containerID}`);

    // Copy the executor into the container
    await this.#copyExecutor(containerID, executorPath);

    // Start the container
    await this.#dockerClient.makeRequest(`/v1.43/containers/${containerID}/start`, 'POST', '');
    log.info(`Started the docker container: ${containerID}`);

    return workflowId;
  }

  async watchWorkflowExecutor(): Promise<{ StatusCode: number }> {
    if (!this.#dockerClient) {
      throw new Error('Docker socket not configured');
    }

    if (!this.#container?.Id) {
      throw new Error('No currently running container');
    }

    log.info(`Watching executor container ${this.#container?.Id}`);

    try {
      const response = await this.#dockerClient.makeRequest(
        `/v1.43/containers/${this.#container?.Id}/wait`,
        'POST',
        '',
        'application/json',
        300000,
      );

      const res = JSON.parse(response);

      log.info(`Container exit code: ${res.StatusCode}`);

      return res;
    } catch (e) {
      if (e instanceof TimeoutError) {
        return this.watchWorkflowExecutor();
      }

      log.error(`Container watch error ${e}`);
      return { StatusCode: 1 };
    }
  }

  async getGraphqlData({
    query,
    variables,
    supportedSinceInstanceVersion,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }: WorkflowGraphqlPayload): Promise<any> {
    try {
      return await this.#api?.fetchFromApi({
        type: 'graphql',
        query,
        variables: variables || {},
        supportedSinceInstanceVersion,
      });
    } catch (e) {
      log.info(`[Duo Workflow] Graphql fetch failed:`, e);

      const error = e as Error;

      log.error(error.message);

      throw new Error(error.message);
    }
  }

  async updateStatus({ workflowId, statusEvent }: DuoWorkflowStatusUpdate) {
    return this.#api?.fetchFromApi<DuoWorkflowStatusUpdateResponse>({
      type: 'rest',
      path: `/ai/duo_workflows/workflows/${workflowId}`,
      method: 'PATCH',
      body: {
        status_event: statusEvent,
      },
    });
  }

  async sendEvent(workflowID: string, eventType: WorkflowEvent, message?: string) {
    const response = await this.#api?.fetchFromApi<CreateWorkflowEventResponse>({
      type: 'rest',
      method: 'POST',
      path: `/ai/duo_workflows/workflows/${workflowID}/events`,
      body: {
        event_type: eventType,
        message: message || '',
      },
      supportedSinceInstanceVersion: {
        resourceName: 'create a workflow event',
        version: '17.5.0',
      },
    });

    if (!response) {
      throw new Error('Failed to create event');
    }
  }

  async isDockerImageAvailable(image: string): Promise<boolean> {
    if (!this.#dockerClient) {
      throw new Error('Docker socket not configured');
    }
    const imagesJson = await this.#dockerClient.makeRequest('/v1.43/images/json', 'GET', '');
    const images = JSON.parse(imagesJson);

    return images.some((img: { RepoTags: string[] }) => img.RepoTags?.includes(image));
  }

  async pullDockerImage(image: string): Promise<string> {
    if (!this.#dockerClient) {
      throw new Error('Docker socket not configured');
    }

    log.info(`Pulling image ${image}`);

    return this.#dockerClient.makeRequest(
      `/v1.43/images/create?fromImage=${image}`,
      'POST',
      '',
      'text/plain',
      300000,
    );
  }

  async #copyExecutor(containerID: string, executorPath: string) {
    if (!this.#dockerClient) {
      throw new Error('Docker client not initialized');
    }

    const fileContents = await readFile(executorPath);
    await this.#dockerClient.makeRequest(
      `/v1.43/containers/${containerID}/archive?path=/`,
      'PUT',
      fileContents,
      'application/x-tar',
    );
  }

  async #downloadWorkflowExecutor(executorBinaryUrl: string, executorPath: string): Promise<void> {
    try {
      await readFile(executorPath);
      log.info(`Found existing executor at ${executorPath}.`);
    } catch (error) {
      log.info(`Downloading workflow executor from ${executorBinaryUrl} to ${executorPath}...`);
      await this.#downloadFile(executorBinaryUrl, executorPath);
    }
  }

  async #downloadFile(url: string, outputPath: string): Promise<void> {
    const response = await this.#fetch.fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await writeFile(outputPath, Buffer.from(buffer));
  }

  async #createWorkflow(goal: string): Promise<string> {
    try {
      const response = await this.#api?.fetchFromApi<CreateWorkflowResponse>({
        type: 'rest',
        method: 'POST',
        path: '/ai/duo_workflows/workflows',
        body: {
          project_id: this.#projectPath,
          goal,
        },
        supportedSinceInstanceVersion: {
          resourceName: 'create a workflow',
          version: '17.3.0',
        },
      });

      return response.id;
    } catch (e) {
      const error = e as Error;
      log.error('[Duo Workflow] Failed to create the workflow', error);
      throw e;
    }
  }

  async #getWorkflowToken(): Promise<GenerateTokenResponse> {
    try {
      const token = await this.#api?.fetchFromApi<GenerateTokenResponse>({
        type: 'rest',
        method: 'POST',
        path: '/ai/duo_workflows/direct_access',
        supportedSinceInstanceVersion: {
          resourceName: 'get workflow direct access',
          version: '17.3.0',
        },
      });

      return token;
    } catch (e) {
      const error = e as Error;
      log.error('[Duo Workflow] Failed to fetch the workflow token', error);
      throw e;
    }
  }

  executorCommand(
    workflowId: string,
    workflowToken: GenerateTokenResponse,
    goal: string,
    logLevel: LogLevel | undefined,
  ) {
    return [
      '/duo-workflow-executor',
      `--workflow-id=${workflowId}`,
      '--server',
      workflowToken.duo_workflow_service.base_url || 'localhost:50052',
      '--goal',
      goal,
      '--base-url',
      workflowToken.gitlab_rails.base_url,
      '--token',
      workflowToken.gitlab_rails.token,
      '--duo-workflow-service-token',
      workflowToken.duo_workflow_service.token,
      '--realm',
      workflowToken.duo_workflow_service.headers['X-Gitlab-Realm'],
      '--user-id',
      workflowToken.duo_workflow_service.headers['X-Gitlab-Global-User-Id'],
      '--instance-id',
      workflowToken.duo_workflow_service.headers['X-Gitlab-Instance-Id'],
      '--git-http-base-url',
      workflowToken.gitlab_rails.base_url,
      '--git-http-user',
      'auth',
      '--git-password',
      workflowToken.gitlab_rails.token,
      '--ignore-git-dir-owners',
    ]
      .concat(this.#optional(!workflowToken.duo_workflow_service.secure, ['--insecure']))
      .concat(this.#optional(logLevel === LOG_LEVEL.DEBUG, ['--debug']))
      .concat(this.#optional(this.#telemetryEnabled, ['--telemetry-enabled']))
      .concat(
        this.#optional(Boolean(workflowToken.workflow_metadata), [
          '--workflow-metadata',
          JSON.stringify(workflowToken.workflow_metadata),
        ]),
      );
  }

  #optional(predicate: boolean, values: string[]) {
    return predicate ? values : [];
  }
}

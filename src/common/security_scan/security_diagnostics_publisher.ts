import {
  DiagnosticSeverity,
  DocumentUri,
  NotificationHandler,
  WorkspaceFolder,
  type Diagnostic,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Injectable, createInterfaceId } from '@khulnasoft/di';
import { KhulnaSoftApiService } from '@khulnasoft/core';
import { ConfigService, IConfig, ISecurityScannerOptions } from '../config_service';
import { DefaultDocumentService, DocumentService } from '../document_service';
import { log } from '../log';
import { ClientFeatureFlags, FeatureFlagService } from '../feature_flags';
import { DiagnosticsPublisher, DiagnosticsPublisherFn } from '../diagnostics_publisher';
import { ApiRequest } from '../api_types';
import { isFetchError } from '../fetch_error';
import { RemoteSecurityScanNotificationParam } from '../notifications';
import { parseURIString } from '../services/fs/utils';
import { DuoProjectAccessChecker } from '../services/duo_access';
import { SecurityScanNotifier } from './security_notifier';
import { SecurityScanClientResponse, Vulnerability } from './types';

// error code for unknown error
const UNKNOWN_ERROR_CODE = 500;
export const ApiErrorMessageMapping: Record<number, string> = {
  401: 'Real-time SAST scan authentication failed. Your KhulnaSoft authentication token is invalid or has expired. Reauthenticate with your KhulnaSoft account or generate a new personal access token.',
  403: 'Real-time SAST scan is not available for this project or [namespace](https://docs.khulnasoft.com/ee/user/namespace).',
  404: 'Real-time SAST scan is not available on your [KhulnaSoft instance version](https://docs.khulnasoft.com/ee/api/projects.html#real-time-security-scan).',
  [UNKNOWN_ERROR_CODE]:
    'Real-time SAST scan failed with an unknown error. Check your network connection, reload your IDE, and try again ',
};

interface SecurityScanResponse {
  vulnerabilities: Vulnerability[];
}

export interface SecurityDiagnosticsPublisher extends DiagnosticsPublisher {
  handleScanNotification: NotificationHandler<RemoteSecurityScanNotificationParam>;
}

export const SecurityDiagnosticsPublisher = createInterfaceId<SecurityDiagnosticsPublisher>(
  'SecurityDiagnosticsPublisher',
);

@Injectable(SecurityDiagnosticsPublisher, [
  KhulnaSoftApiService,
  FeatureFlagService,
  ConfigService,
  DocumentService,
  SecurityScanNotifier,
  DuoProjectAccessChecker,
])
export class DefaultSecurityDiagnosticsPublisher implements SecurityDiagnosticsPublisher {
  #publish: DiagnosticsPublisherFn | undefined;

  #opts?: ISecurityScannerOptions;

  #api: KhulnaSoftApiService;

  #featureFlagService: FeatureFlagService;

  #securityScanNotifier: SecurityScanNotifier;

  #documentService: DocumentService;

  #duoProjectAccessChecker: DuoProjectAccessChecker;

  #workspaceFolders: WorkspaceFolder[];

  constructor(
    api: KhulnaSoftApiService,
    featureFlagService: FeatureFlagService,
    configService: ConfigService,
    documentService: DocumentService,
    securityScanNotifier: SecurityScanNotifier,
    duoProjectAccessChecker: DuoProjectAccessChecker,
  ) {
    this.#api = api;
    this.#featureFlagService = featureFlagService;
    this.#documentService = documentService;
    this.#securityScanNotifier = securityScanNotifier;
    this.#duoProjectAccessChecker = duoProjectAccessChecker;
    this.#workspaceFolders = configService.get('client.workspaceFolders') || [];

    configService.onConfigChange((config: IConfig) => {
      this.#opts = config.client.securityScannerOptions;
      this.#workspaceFolders = config.client.workspaceFolders || [];
    });
  }

  init(callback: DiagnosticsPublisherFn): void {
    this.#publish = callback;
  }

  async handleScanNotification(params: RemoteSecurityScanNotificationParam): Promise<void> {
    await this.#runSecurityScan(params.documentUri);
  }

  async #runSecurityScan(documentSource: TextDocument | DocumentUri) {
    let filePath;
    try {
      const document = DefaultDocumentService.isTextDocument(documentSource)
        ? documentSource
        : this.#documentService.getDocument(documentSource);
      if (!document) return;

      const workspaceFolder = this.#workspaceFolders.find((wf) => document.uri.startsWith(wf.uri));
      if (!workspaceFolder) {
        throw new Error('Real-time SAST scan failed. No valid workspace detected.');
      }
      const { project } = this.#duoProjectAccessChecker.checkProjectStatus(
        document.uri,
        workspaceFolder,
      );

      if (!project?.namespaceWithPath) {
        throw new Error('Real-time SAST scan failed. No valid project detected.');
      }

      if (!this.#publish) {
        this.#logError('The DefaultSecurityService has not been initialized. Call init first.');
        throw new Error('Real-time SAST scan failed. Reload your IDE, and try again');
      }
      if (!this.#featureFlagService.isClientFlagEnabled(ClientFeatureFlags.RemoteSecurityScans)) {
        return;
      }
      if (!this.#opts?.enabled) {
        return;
      }
      if (!this.#opts) {
        return;
      }

      filePath = parseURIString(document.uri).path;
      const content = document.getText();
      const encodedProjectPath = encodeURIComponent(project.namespaceWithPath);
      const path = `/projects/${encodedProjectPath}/security_scans/sast/scan`;
      const securityScanRequest: ApiRequest<SecurityScanResponse> = {
        type: 'rest',
        method: 'POST',
        path,
        body: {
          file_path: filePath,
          content,
        },
        supportedSinceInstanceVersion: {
          resourceName: 'SAST security scan',
          version: '17.5.0',
        },
      };

      log.debug(`SecurityScan: scanning contents of "${filePath}"...`);
      const response: SecurityScanResponse = await this.#api.fetchFromApi(securityScanRequest);

      const vulns = response.vulnerabilities;

      if (vulns == null || !Array.isArray(vulns)) {
        return;
      }

      const diagnostics: Diagnostic[] = vulns.map(this.#mapVulnerabilityToDiagnostic);

      await this.#publish({
        uri: document.uri,
        diagnostics,
      });

      const notificationResponse: SecurityScanClientResponse = {
        filePath,
        status: 200,
        results: vulns,
        timestamp: Date.now(),
      };

      await this.#securityScanNotifier.sendScanResponse(notificationResponse);
    } catch (error) {
      await this.#handleError(error, filePath ?? documentSource.toString());
    }
  }

  #mapVulnerabilityToDiagnostic(vuln: Vulnerability) {
    const message = `${vuln.name}\n\n${vuln.description}`;
    const severity =
      vuln.severity === 'high' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning;

    return {
      message,
      range: {
        start: {
          line: vuln.location.start_line - 1,
          character: vuln.location.start_column - 1,
        },
        end: {
          line: vuln.location.end_line - 1,
          character: vuln.location.end_column - 1,
        },
      },
      severity,
      source: 'gitlab_security_scan',
    };
  }

  #logError(error: unknown): void {
    log.warn('SecurityScan: failed to run security scan', error);
  }

  async #handleError(error: unknown, filePath: string): Promise<void> {
    this.#logError(error);
    // TODO: remove status from SecurityScanClientResponse
    const status = isFetchError(error) ? error.status : UNKNOWN_ERROR_CODE;

    let errorMessage: string | unknown;
    if (isFetchError(error)) {
      errorMessage = ApiErrorMessageMapping[status] ?? ApiErrorMessageMapping[UNKNOWN_ERROR_CODE];
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    const response: SecurityScanClientResponse = {
      filePath,
      timestamp: Date.now(),
      status,
      error: errorMessage ?? ApiErrorMessageMapping[UNKNOWN_ERROR_CODE],
    };

    await this.#securityScanNotifier.sendScanResponse(response);
  }
}

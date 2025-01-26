import {
  NotificationType,
  PublishDiagnosticsParams,
  CompletionItem,
  InlineCompletionRequest,
  DidChangeWorkspaceFoldersNotification,
} from 'vscode-languageserver-protocol';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { ThemeNotificationHandler } from '@khulnasoft/webview-theme';
import { AIContextManager } from '@khulnasoft/ai-context';
import { InitializeHandler } from './core/handlers/initialize_handler';
import { DidChangeWorkspaceFoldersHandler } from './core/handlers/did_change_workspace_folders_handler';
import { TokenCheckNotifier } from './core/handlers/token_check_notifier';
import { Notifier } from './notifier';
import { LsConnection } from './external_interfaces';
import { SecurityDiagnosticsPublisher } from './security_scan/security_diagnostics_publisher';
import { DiagnosticsPublisher } from './diagnostics_publisher';
import { FeatureStateManager } from './feature_state';
import {
  FeatureStateChangeNotificationType,
  TokenCheckNotificationType,
  DidChangeDocumentInActiveEditor,
  DidChangeThemeNotificationType,
  ApiErrorNotificationType,
  ApiRecoveryNotificationType,
  StreamingCompletionResponseNotificationType,
  CancelStreamingNotificationType,
  RemoteSecurityScanNotificationType,
  RemoteSecurityResponseScanNotificationType,
  TelemetryNotificationType,
  StartWorkflowNotificationType,
  SendWorkflowEventNotificationType,
} from './notifications';
import { DocumentService } from './document_service';
import { SuggestionApiErrorNotifier } from './feature_state/suggestion_api_error_notifier';
import { StreamingHandler } from './suggestion/streaming_handler';
import { SuggestionService } from './suggestion/suggestion_service';
import { AIContextEndpoints } from './ai_context_management';
import {
  CONFIGURATION_VALIDATION_REQUEST,
  ConfigurationValidationService,
} from './configuration_validation/configuration_validation_service';
import { SecurityScanNotifier } from './security_scan/security_notifier';
import { TelemetryNotificationHandler } from './core/handlers/telemetry_notification_handler';
import { DidChangeConfigurationHandler } from './core/handlers/did_change_configuration_handler';
import { WorkflowHandler } from './workflow_handler';
import {
  SECURITY_DIAGNOSTICS_CATEGORY,
  SECURITY_DIAGNOSTICS_EVENT,
} from './tracking/security_scan/security_diagnostics_tracker';

export interface ConnectionService {}

export const ConnectionService = createInterfaceId<ConnectionService>('ConnectionService');

const createNotifyFn =
  <T>(c: LsConnection, method: NotificationType<T>) =>
  (param: T) =>
    c.sendNotification(method, param);

const createDiagnosticsPublisherFn = (c: LsConnection) => (param: PublishDiagnosticsParams) =>
  c.sendDiagnostics(param);

@Injectable(ConnectionService, [
  LsConnection,
  TokenCheckNotifier,
  InitializeHandler,
  DidChangeWorkspaceFoldersHandler,
  SecurityDiagnosticsPublisher,
  DocumentService,
  FeatureStateManager,
  ThemeNotificationHandler,
  SuggestionApiErrorNotifier,
  StreamingHandler,
  SuggestionService,
  AIContextManager,
  ConfigurationValidationService,
  SecurityScanNotifier,
  TelemetryNotificationHandler,
  DidChangeConfigurationHandler,
  WorkflowHandler,
])
export class DefaultConnectionService implements ConnectionService {
  #connection: LsConnection;

  constructor(
    connection: LsConnection,
    tokenCheckNotifier: TokenCheckNotifier,
    initializeHandler: InitializeHandler,
    didChangeWorkspaceFoldersHandler: DidChangeWorkspaceFoldersHandler,
    securityDiagnosticsPublisher: SecurityDiagnosticsPublisher,
    documentService: DocumentService,
    featureStateManager: FeatureStateManager,
    themeNotificationHandler: ThemeNotificationHandler,
    suggestionApiErrorNotifier: SuggestionApiErrorNotifier,
    streamingHandler: StreamingHandler,
    suggestionService: SuggestionService,
    aiContextManager: AIContextManager,
    configValidationService: ConfigurationValidationService,
    securityScanNotifier: SecurityScanNotifier,
    telemetryNotificationHandler: TelemetryNotificationHandler,
    didChangeConfigurationHandler: DidChangeConfigurationHandler,
    workflowHandler: WorkflowHandler,
  ) {
    this.#connection = connection;

    // request handlers
    connection.onInitialize(initializeHandler.requestHandler);
    // suggestion handlers
    connection.onCompletion(suggestionService.completionHandler);
    // TODO: does Visual Studio or Neovim need this? VS Code doesn't
    connection.onCompletionResolve((item: CompletionItem) => item);
    connection.onRequest(InlineCompletionRequest.type, suggestionService.inlineCompletionHandler);

    connection.onRequest(CONFIGURATION_VALIDATION_REQUEST, (config) =>
      configValidationService.validate(config),
    );

    connection.onInitialized(async () => {
      // notifiers
      this.#initializeNotifier(TokenCheckNotificationType, tokenCheckNotifier);
      this.#initializeNotifier(FeatureStateChangeNotificationType, featureStateManager);
      this.#initializeNotifier(StreamingCompletionResponseNotificationType, streamingHandler);
      this.#initializeNotifier(RemoteSecurityResponseScanNotificationType, securityScanNotifier);
      // FIXME: the following notifications are deprecated, once all clients use state check
      // src/common/feature_state/suggestion_api_error_check.ts
      // we can remove these notifiers
      suggestionApiErrorNotifier.setErrorNotifyFn(
        createNotifyFn(this.#connection, ApiErrorNotificationType),
      );
      suggestionApiErrorNotifier.setRecoveryNotifyFn(
        createNotifyFn(this.#connection, ApiRecoveryNotificationType),
      );

      // This notification must be registered on initialized! It won't work if you register it before initialization.
      connection.onNotification(DidChangeWorkspaceFoldersNotification.method, (params) => {
        didChangeWorkspaceFoldersHandler.notificationHandler(params);
      });
    });

    // notification handlers
    connection.onNotification(DidChangeDocumentInActiveEditor, (params) =>
      documentService.notificationHandler(params),
    );
    connection.onNotification(DidChangeThemeNotificationType, (message) =>
      themeNotificationHandler.handleThemeChange(message),
    );
    connection.onNotification(CancelStreamingNotificationType, (stream) =>
      streamingHandler.notificationHandler(stream),
    );
    connection.onNotification(RemoteSecurityScanNotificationType, (params) => {
      securityDiagnosticsPublisher.handleScanNotification(params);
      telemetryNotificationHandler.notificationHandler({
        category: SECURITY_DIAGNOSTICS_CATEGORY,
        action: SECURITY_DIAGNOSTICS_EVENT.SCAN_INITIATED,
        context: {
          source: params.source,
        },
      });
    });

    connection.onNotification(TelemetryNotificationType, (params) =>
      telemetryNotificationHandler.notificationHandler(params),
    );

    connection.onDidChangeConfiguration(didChangeConfigurationHandler.notificationHandler);

    // diagnostics publishers
    this.#initializeDiagnosticsPublisher(securityDiagnosticsPublisher);

    // AI Context
    connection.onRequest(AIContextEndpoints.QUERY, (query) =>
      aiContextManager.searchContextItemsForCategory(query),
    );
    connection.onRequest(AIContextEndpoints.ADD, (item) =>
      aiContextManager.addSelectedContextItem(item),
    );
    connection.onRequest(AIContextEndpoints.REMOVE, (item) =>
      aiContextManager.removeSelectedContextItem(item),
    );
    connection.onRequest(AIContextEndpoints.CURRENT_ITEMS, () =>
      aiContextManager.getSelectedContextItems(),
    );
    connection.onRequest(AIContextEndpoints.CLEAR, () =>
      aiContextManager.clearSelectedContextItems(),
    );
    connection.onRequest(AIContextEndpoints.RETRIEVE, () =>
      aiContextManager.retrieveContextItemsWithContent({
        featureType: 'duo_chat',
      }),
    );
    connection.onRequest(AIContextEndpoints.GET_PROVIDER_CATEGORIES, () =>
      aiContextManager.getAvailableCategories(),
    );
    connection.onRequest(AIContextEndpoints.GET_ITEM_CONTENT, (item) =>
      aiContextManager.getItemWithContent(item),
    );

    // Workflow
    connection.onNotification(
      StartWorkflowNotificationType,
      workflowHandler.startWorkflowNotificationHandler,
    );

    connection.onNotification(
      SendWorkflowEventNotificationType,
      workflowHandler.sendWorkflowEventHandler,
    );
  }

  #initializeNotifier<T>(method: NotificationType<T>, notifier: Notifier<T>) {
    notifier.init(createNotifyFn(this.#connection, method));
  }

  #initializeDiagnosticsPublisher(publisher: DiagnosticsPublisher) {
    publisher.init(createDiagnosticsPublisherFn(this.#connection));
  }
}

#!/usr/bin/env node
import EventEmitter from 'events';
import { Console } from 'node:console';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ProposedFeatures, TextDocuments, createConnection } from 'vscode-languageserver/node';
import { install as installSourceMapSupport } from 'source-map-support';
import { EndpointProvider } from '@khulnasoft/endpoint';
import { EndpointConnectionAdapter } from '@khulnasoft/endpoint-lsp-adapter';
import { chatWebviewPlugin } from '@khulnasoft/webview-chat';
import { workflowPluginFactory } from '@khulnasoft/webview-duo-workflow';
import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import {
  webviewContributions,
  WebviewTransportService,
  ExtensionMessageBusProvider,
  PluginManager,
} from '@khulnasoft/webview';
import { JsonRpcConnectionTransport } from '@khulnasoft/webview-transport-json-rpc';
import { WebviewPlugin } from '@khulnasoft/webview-plugin';
import { Transport } from '@khulnasoft/webview-transport';
import { duoChatPluginFactory } from '@khulnasoft/webview-duo-chat';
import { remoteSecurityWebviewPlugin } from '@khulnasoft/webview-vuln-details';
import { duoChatPluginFactory as duoChatV2PluginFactory } from '@khulnasoft/webview-duo-chat-v2';
import { Container, brandInstance } from '@khulnasoft/di';
import { addWebviewThemeServicesToContainer } from '@khulnasoft/webview-theme';
import { UserService } from '@khulnasoft/core';
import { AIContextManager } from '@khulnasoft/ai-context';
import { log } from '../common/log';
import {
  commonContributions,
  ConfigService,
  DefaultStreamingHandler,
  GET_WEBVIEW_METADATA_REQUEST,
  KhulnaSoftApiClient,
} from '../common';
import { LsConnection, LsConsoleLog, LsTextDocuments } from '../common/external_interfaces';
import { LsFetch } from '../common/fetch';
import { getLanguageServerVersion } from '../common/utils/get_language_server_version';
import { DefaultDocumentService, DocumentService } from '../common/document_service';
import { DefaultTokenCheckNotifier } from '../common/core/handlers/token_check_notifier';
import { DefaultSecurityDiagnosticsPublisher } from '../common/security_scan/security_diagnostics_publisher';
import { DefaultConnectionService } from '../common/connection_service';
import {
  ExtensionConnectionMessageBusProvider,
  WebviewLocationService,
  WebviewMetadataProvider,
  DefaultWebviewThemeBroadcastService,
} from '../common/webview';
import { DefaultSuggestionService } from '../common/suggestion/suggestion_service';
import { DefaultWebviewHtmlTransformer, WebviewHtmlTransformer } from '../common/webview/html';
import { DefaultVirtualFileSystemService } from '../common/services/fs/virtual_file_system_service';
import { DefaultRepositoryService } from '../common/services/git/repository_service';
import { DefaultSecurityScanNotifier } from '../common/security_scan/security_notifier';
import { DesktopDirectoryWalker } from './services/fs';
import { DesktopWorkflowRunner } from './duo_workflow/desktop_workflow_runner';
import { DesktopTreeSitterParser } from './tree_sitter/parser';
import { Fetch } from './fetch';
import { setupHttp } from './setup_http';
import { NodeSentryTracker } from './node_sentry_tracker';
import { DesktopFsClient } from './services/fs/fs';

const webviewPlugins = new Set<WebviewPlugin>();
webviewPlugins.add(chatWebviewPlugin);

async function main() {
  const useSourceMaps = process.argv.includes('--use-source-maps');
  const printVersion = process.argv.includes('--version') || process.argv.includes('-v');
  const version = getLanguageServerVersion();
  if (printVersion) {
    // eslint-disable-next-line no-console
    console.error(`KhulnaSoft Language Server v${version}`);
    return;
  }

  // We have many components listening to changes to API and Config and so we increase the default (10) limit on listeners
  // https://github.com/khulnasoft/khulnasoft-lsp/-/issues/585
  EventEmitter.setMaxListeners(30);

  if (useSourceMaps) installSourceMapSupport();

  /* ----- START: SETUP CONNECTION ------- */
  const connection = createConnection(ProposedFeatures.all);
  // Send all console messages to stderr. Stdin/stdout may be in use
  // as the LSP communications channel.
  //
  // This has to happen after the `createConnection` because the `vscode-languageserver` server version 9 and higher
  // patches the console as well
  // https://github.com/microsoft/vscode-languageserver-node/blob/84285312d8d9f22ee0042e709db114e5415dbdde/server/src/node/main.ts#L270
  //
  // FIXME: we should really use the remote logging with `window/logMessage` messages
  // That's what the authors of the languageserver-node want us to use
  // https://github.com/microsoft/vscode-languageserver-node/blob/4e057d5d6109eb3fcb075d0f99456f05910fda44/server/src/common/server.ts#L133
  global.console = new Console({ stdout: process.stderr, stderr: process.stderr });
  /* ----- END: SETUP CONNECTION ------- */

  const container = new Container();
  container.addInstances(brandInstance(LsConnection, connection));
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  container.addInstances(brandInstance(LsTextDocuments, documents));

  container.addInstances(brandInstance(LsConsoleLog, (msg: string) => console.log(msg)));
  const lsFetch = new Fetch();
  await lsFetch.initialize();
  container.addInstances(brandInstance(LsFetch, lsFetch));

  const documentService = new DefaultDocumentService(documents);
  container.addInstances(brandInstance(DocumentService, documentService));

  container.addInstances(
    brandInstance(
      ExtensionMessageBusProvider,
      new ExtensionConnectionMessageBusProvider({
        connection,
        logger: log,
      }),
    ),
  );

  addWebviewThemeServicesToContainer(container, log);
  container.instantiate(
    ...commonContributions,
    ...webviewContributions,
    DefaultTokenCheckNotifier,
    DefaultSecurityScanNotifier,
    DefaultSecurityDiagnosticsPublisher,
    DesktopDirectoryWalker,
    DesktopTreeSitterParser,
    NodeSentryTracker,
    DefaultVirtualFileSystemService,
    DefaultRepositoryService,
    DesktopFsClient,
    DefaultWebviewHtmlTransformer,
    DefaultStreamingHandler,
    DefaultConnectionService,
    DefaultSuggestionService,
    DefaultWebviewThemeBroadcastService,
    DesktopWorkflowRunner,
  );

  log.setup(container.get(ConfigService));

  const webviewLocationService = new WebviewLocationService();
  const webviewTransports = new Set<Transport>();
  const webviewMetadataProvider = new WebviewMetadataProvider(
    webviewLocationService,
    webviewPlugins,
  );

  log.info(`KhulnaSoft Language Server is starting (v${version})`);

  webviewTransports.add(
    new JsonRpcConnectionTransport({
      connection,
      logger: log,
    }),
  );

  // FIXME: This is antipattern, don't use the connection here in main.ts
  // set up all your request and notification handlers in the ConnectionService
  connection.onRequest(GET_WEBVIEW_METADATA_REQUEST, () => {
    return webviewMetadataProvider?.getMetadata() ?? [];
  });
  // Make the text document manager listen on the connection for open, change and close text document events
  documents.listen(connection);

  // TODO: move to a common connection setup location
  const endpointProviders = container.getAll(EndpointProvider);
  const endpoints = endpointProviders.flatMap((provider) => provider.getEndpoints());
  const endpointConnectionAdapter = new EndpointConnectionAdapter(connection, [], log);
  endpointConnectionAdapter.applyEndpoints(endpoints);

  // Listen on the connection
  connection.listen();

  webviewPlugins.add(workflowPluginFactory(container.get(WorkflowAPI), connection));
  webviewPlugins.add(
    duoChatPluginFactory({
      gitlabApiClient: container.get(KhulnaSoftApiClient),
      logger: log,
    }),
  );

  webviewPlugins.add(
    duoChatV2PluginFactory({
      gitlabApiClient: container.get(KhulnaSoftApiClient),
      userService: container.get(UserService),
      logger: log,
      aiContextManager: container.get(AIContextManager),
    }),
  );

  webviewPlugins.add(remoteSecurityWebviewPlugin(connection));

  await setupHttp(
    Array.from(webviewPlugins),
    webviewLocationService,
    webviewTransports,
    container.get(WebviewHtmlTransformer),
    log,
  );

  const webviewTransportService = container.get(WebviewTransportService);
  webviewTransports.forEach((transport) => webviewTransportService.registerTransport(transport));

  const pluginManager = container.get(PluginManager);
  webviewPlugins.forEach((plugin) => pluginManager.registerPlugin(plugin));

  log.info('KhulnaSoft Language Server has started');
}

main().catch((e) => log.error(`failed to start the language server`, e));

import EventEmitter from 'events';
import {
  ProposedFeatures,
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
  TextDocuments,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Container, brandInstance } from '@khulnasoft/di';
import { commonContributions, ConfigService, DefaultStreamingHandler } from '../common';
import { log } from '../common/log';
import { LsConnection, LsConsoleLog, LsTextDocuments } from '../common/external_interfaces';
import { LsFetch } from '../common/fetch';
import { getLanguageServerVersion } from '../common/utils/get_language_server_version';
import { DefaultDocumentService, DocumentService } from '../common/document_service';
import { DefaultTokenCheckNotifier } from '../common/core/handlers/token_check_notifier';
import { DefaultSecurityDiagnosticsPublisher } from '../common/security_scan/security_diagnostics_publisher';
import { DefaultConnectionService } from '../common/connection_service';
import { DefaultDirectoryWalker } from '../common/services/fs';
import { DefaultSuggestionService } from '../common/suggestion/suggestion_service';
import { NoopSentryTracker } from '../common/tracking/error_tracker';
import { DefaultVirtualFileSystemService } from '../common/services/fs/virtual_file_system_service';
import { DefaultRepositoryService } from '../common/services/git/repository_service';
import { EmptyFsClient } from '../common/services/fs/fs';
import { Fetch } from './fetch';
import { BrowserTreeSitterParser } from './tree_sitter';

async function main() {
  // eslint-disable-next-line no-restricted-globals
  const worker: Worker = self as unknown as Worker;
  const messageReader = new BrowserMessageReader(worker);
  const messageWriter = new BrowserMessageWriter(worker);

  const container = new Container();
  const lsFetch = new Fetch();
  container.addInstances(brandInstance(LsFetch, lsFetch));
  const connection = createConnection(ProposedFeatures.all, messageReader, messageWriter);
  container.addInstances(brandInstance(LsConnection, connection));
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  container.addInstances(brandInstance(LsTextDocuments, documents));

  const documentService = new DefaultDocumentService(documents);
  container.addInstances(brandInstance(DocumentService, documentService));

  // We have many components listening to changes to API and Config and so we increase the default (10) limit on listeners
  // https://github.com/khulnasoft/khulnasoft-lsp/-/issues/585
  EventEmitter.setMaxListeners(30);
  container.addInstances(brandInstance(LsConsoleLog, (msg: string) => console.log(msg)));

  container.instantiate(
    ...commonContributions,
    DefaultTokenCheckNotifier,
    DefaultSecurityDiagnosticsPublisher,
    DefaultDirectoryWalker,
    BrowserTreeSitterParser,
    NoopSentryTracker,
    DefaultVirtualFileSystemService,
    DefaultRepositoryService,
    EmptyFsClient,
    DefaultStreamingHandler,
    DefaultConnectionService,
    DefaultSuggestionService,
  );

  log.setup(container.get(ConfigService));

  const version = getLanguageServerVersion();
  log.info(`KhulnaSoft Language Server is starting (v${version})`);

  await lsFetch.initialize();

  // Make the text document manager listen on the connection for open, change and close text document events
  documents.listen(connection);
  // Listen on the connection
  connection.listen();

  log.info('KhulnaSoft Language Server has started');
}

main().catch((e) => log.error(e));

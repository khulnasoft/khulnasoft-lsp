import { Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createInterfaceId } from '@khulnasoft/di';

export type LsConnection = Connection;
export const LsConnection = createInterfaceId<LsConnection>('LsConnection');

export type LsTextDocuments = TextDocuments<TextDocument>;
export const LsTextDocuments = createInterfaceId<LsTextDocuments>('LsTextDocuments');

export type LsConsoleLog = (msg: string) => void;
export const LsConsoleLog = createInterfaceId<LsConsoleLog>('LsConsoleLog');

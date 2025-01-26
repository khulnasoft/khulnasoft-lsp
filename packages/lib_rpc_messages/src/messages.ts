import { declareNotification, declareRequest } from '@khulnasoft/rpc-message';
import {
  GetFileContextParams,
  GetFileContextResponse,
  InsertCodeSnippetParams,
  SendMessageParams,
} from './schemas';

export const sendMessage = declareNotification('$/gitlab/sendMessage')
  .withName('Send Message')
  .withDescription(
    "Notify the IDE extension to render a user-facing message in the IDE's user interface.",
  )
  .withParams(SendMessageParams)
  .build();

export const getFileContext = declareRequest('$/gitlab/file/current/getFileContext')
  .withName('Get File Context')
  .withDescription('Retrieve information about the current file and editor context.')
  .withParams(GetFileContextParams)
  .withResponse(GetFileContextResponse)
  .build();

export const insertCodeSnippet = declareNotification('$/gitlab/file/current/insertCodeSnippet')
  .withName('Insert Code Snippet')
  .withDescription('Insert a given code snippet into the current file at the cursor position.')
  .withParams(InsertCodeSnippetParams)
  .build();

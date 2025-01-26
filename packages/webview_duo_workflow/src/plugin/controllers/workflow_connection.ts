import { Connection } from 'vscode-languageserver';
import { ControllerNoReply, openUrlParams } from './types';
import { NO_REPLY } from './constants';

export const initWorkflowConnectionController = (connection: Connection) => {
  return {
    async openUrl({ url }: openUrlParams): Promise<ControllerNoReply> {
      await connection.sendNotification('$/gitlab/openUrl', { url });
      return NO_REPLY;
    },
  };
};

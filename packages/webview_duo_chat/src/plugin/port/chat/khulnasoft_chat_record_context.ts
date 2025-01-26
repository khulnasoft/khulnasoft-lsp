import { getActiveFileContext, KhulnaSoftChatFileContext } from './gitlab_chat_file_context';

export type KhulnaSoftChatRecordContext = {
  currentFile: KhulnaSoftChatFileContext;
};

export const buildCurrentContext = (): KhulnaSoftChatRecordContext | undefined => {
  const currentFile = getActiveFileContext();

  if (!currentFile) {
    return undefined;
  }

  return { currentFile };
};

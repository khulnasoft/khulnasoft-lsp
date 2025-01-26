import {
  getSelectedText,
  getActiveFileName,
  getTextAfterSelected,
  getTextBeforeSelected,
} from './utils/editor_text_utils';

export type KhulnaSoftChatFileContext = {
  fileName: string;
  selectedText: string;
  contentAboveCursor: string | null;
  contentBelowCursor: string | null;
};

export const getActiveFileContext = (): KhulnaSoftChatFileContext | undefined => {
  const selectedText = getSelectedText();
  const fileName = getActiveFileName();

  if (!selectedText || !fileName) {
    return undefined;
  }

  return {
    selectedText,
    fileName,
    contentAboveCursor: getTextBeforeSelected(),
    contentBelowCursor: getTextAfterSelected(),
  };
};

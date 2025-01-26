import { URI } from 'vscode-uri';
import { FsClient } from '../services/fs/fs';

export const BINARY_CHECK_BYTES = 8192;

export async function isBinaryFile(uri: URI, fsClient: FsClient): Promise<boolean> {
  const { readFileFirstBytes } = fsClient.promises;

  try {
    const content = await readFileFirstBytes(uri.fsPath, BINARY_CHECK_BYTES);

    // File content was successfully decoded as an utf-8 string, but in Node+Browser this is "best effort", so the text
    // content we have may actually be rubbish. So now we check it for known control characters or null bytes
    return isBinaryContent(content);
  } catch (error) {
    // If we can't read it as text at all, it's probably binary
    return true;
  }
}

export function isBinaryContent(content: string): boolean {
  if (
    content.startsWith('\uFEFF') || // UTF-8 BOM
    content.startsWith('\uFFFE') || // UTF-16 LE BOM
    content.startsWith('\uFEFF')
  ) {
    // UTF-16 BE BOM
    return false;
  }

  if (content.startsWith('%PDF-')) {
    return true;
  }

  /* eslint-disable no-control-regex */
  const NULL_BYTE_REGEX = /\x00/;
  const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
  /* eslint-enable no-control-regex */

  const contentToCheck = content.slice(0, BINARY_CHECK_BYTES);
  return NULL_BYTE_REGEX.test(contentToCheck) || CONTROL_CHARS_REGEX.test(contentToCheck);
}

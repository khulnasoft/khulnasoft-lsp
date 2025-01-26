import { getActiveFileContext } from './gitlab_chat_file_context';

let mocketSelectedTextValue: string | null = 'selectedText';
let mockFileNameValue: string | null = 'filename';

jest.mock('./utils/editor_text_utils', () => ({
  getSelectedText: jest.fn().mockImplementation(() => mocketSelectedTextValue),
  getActiveFileName: jest.fn().mockImplementation(() => mockFileNameValue),
  getTextAfterSelected: jest.fn().mockReturnValue('textAfterSelection'),
  getTextBeforeSelected: jest.fn().mockReturnValue('textBeforeSelection'),
}));

describe('getActiveFileContext', () => {
  it('returns null when no text is selected', () => {
    mocketSelectedTextValue = null;

    expect(getActiveFileContext()).toBe(undefined);
  });

  it('returns null when no file is selected', () => {
    mockFileNameValue = null;

    expect(getActiveFileContext()).toBe(undefined);
  });

  it('sets values text is selected', () => {
    mocketSelectedTextValue = 'selectedText';
    mockFileNameValue = 'filename';

    const context = getActiveFileContext();

    expect(context?.selectedText).toBe('selectedText');
    expect(context?.fileName).toBe('filename');
    expect(context?.contentAboveCursor).toBe('textBeforeSelection');
    expect(context?.contentBelowCursor).toBe('textAfterSelection');
  });
});

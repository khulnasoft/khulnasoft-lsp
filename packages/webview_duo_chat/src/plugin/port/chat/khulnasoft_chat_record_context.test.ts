import { buildCurrentContext } from './gitlab_chat_record_context';
import { KhulnaSoftChatFileContext } from './gitlab_chat_file_context';

let mockExpectedCurrentFileContext: KhulnaSoftChatFileContext | undefined;

jest.mock('./gitlab_chat_file_context', () => ({
  getActiveFileContext: jest.fn().mockImplementation(() => mockExpectedCurrentFileContext),
}));

describe('buildCurrentContext', () => {
  describe('with active file selection', () => {
    it('returns current file context', () => {
      mockExpectedCurrentFileContext = {
        fileName: 'foo',
        selectedText: 'bar',
        contentAboveCursor: 'above',
        contentBelowCursor: 'below',
      };

      expect(buildCurrentContext()).toStrictEqual({
        currentFile: mockExpectedCurrentFileContext,
      });
    });
  });

  it('is undefined without active file selection', () => {
    mockExpectedCurrentFileContext = undefined;

    expect(buildCurrentContext()).toBeUndefined();
  });
});

import type { Logger } from '@khulnasoft/logging';
import { createMockLogger } from '@khulnasoft/webview/src/test_utils/mocks';
import type { AIContextItem } from '@khulnasoft/ai-context';
import { isBinaryContent } from '../../utils/binary_content';
import { OPEN_TAB_FILE } from '../test_utils/mock_data';
import {
  DefaultBinaryFileTransformer,
  BINARY_FILE_DISABLED_REASON,
} from './ai_context_binary_file_transformer';

jest.mock('../../utils/binary_content', () => ({
  isBinaryContent: jest.fn().mockReturnValue(false),
}));

describe('DefaultBinaryFileTransformer', () => {
  let transformer: DefaultBinaryFileTransformer;
  let mockLogger: Logger;
  let mockContextItem: AIContextItem;

  beforeEach(() => {
    mockContextItem = {
      ...OPEN_TAB_FILE,
      content: 'Some text content',
      metadata: {
        ...OPEN_TAB_FILE.metadata,
        enabled: true,
        disabledReasons: [],
      },
    };

    mockLogger = createMockLogger();
    transformer = new DefaultBinaryFileTransformer(mockLogger);
  });

  describe('transform', () => {
    it('returns item unchanged when content is undefined', async () => {
      const itemWithoutContent = { ...mockContextItem, content: undefined };

      const result = await transformer.transform(itemWithoutContent);

      expect(isBinaryContent).not.toHaveBeenCalled();
      expect(result).toEqual(itemWithoutContent);
    });

    it('leaves non-binary content unchanged', async () => {
      jest.mocked(isBinaryContent).mockReturnValue(false);

      const result = await transformer.transform(mockContextItem);

      expect(isBinaryContent).toHaveBeenCalledWith(mockContextItem.content);
      expect(result).toEqual(mockContextItem);
    });

    it('disables context item and clears content when binary content detected', async () => {
      jest.mocked(isBinaryContent).mockReturnValue(true);

      const result = await transformer.transform(mockContextItem);

      expect(result).toEqual({
        ...mockContextItem,
        content: '',
        metadata: {
          ...mockContextItem.metadata,
          enabled: false,
          disabledReasons: [BINARY_FILE_DISABLED_REASON],
        },
      });
    });

    it('preserves existing disabled reasons when adding binary reason', async () => {
      jest.mocked(isBinaryContent).mockReturnValue(true);
      mockContextItem.metadata.disabledReasons = ['existing reason'];

      const result = await transformer.transform(mockContextItem);

      expect(result.metadata.disabledReasons).toEqual([
        'existing reason',
        BINARY_FILE_DISABLED_REASON,
      ]);
    });
  });
});

import { AIContextItem } from '@khulnasoft/ai-context';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { IDocContext } from '../../document_transformer_service';
import { EmptyContentPreProcessor } from './empty_content';

describe('EmptyContentPreProcessor', () => {
  let processor: EmptyContentPreProcessor;
  let mockContext: IDocContext;
  let mockContextItem: AIContextItem;

  beforeEach(() => {
    mockContext = createFakePartial<IDocContext>({
      prefix: 'prefix',
      suffix: 'suffix',
    });

    mockContextItem = createFakePartial<AIContextItem>({
      id: 'test-id',
      category: 'file',
      metadata: {
        title: 'test.ts',
        enabled: true,
        icon: 'document',
        secondaryText: 'test.ts',
        subType: 'open_tab',
        subTypeLabel: 'Project file',
      },
    });

    processor = new EmptyContentPreProcessor();
  });

  it('should filter out items with empty content', async () => {
    const input = [
      { ...mockContextItem, content: 'content1' },
      { ...mockContextItem, id: 'test-id-2', content: '   ' },
      { ...mockContextItem, id: 'test-id-3', content: 'content3' },
    ];

    const result = await processor.process({ documentContext: mockContext, aiContextItems: input });
    expect(result.preProcessorItems.aiContextItems).toEqual([input[0], input[2]]);
  });

  it('should handle items without content', async () => {
    const input = [
      { ...mockContextItem },
      { ...mockContextItem, id: 'test-id-2', content: undefined },
    ];

    const result = await processor.process({ documentContext: mockContext, aiContextItems: input });
    expect(result.preProcessorItems.aiContextItems).toEqual([]);
  });

  it('should handle empty input array', async () => {
    const result = await processor.process({ documentContext: mockContext, aiContextItems: [] });
    expect(result.preProcessorItems.aiContextItems).toEqual([]);
  });

  it('should preserve non-empty content items', async () => {
    const input = [
      { ...mockContextItem, content: 'content1' },
      { ...mockContextItem, id: 'test-id-2', content: 'content2' },
    ];

    const result = await processor.process({ documentContext: mockContext, aiContextItems: input });
    expect(result.preProcessorItems.aiContextItems).toEqual(input);
  });
});

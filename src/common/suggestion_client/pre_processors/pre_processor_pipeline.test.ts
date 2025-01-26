import { AIContextItem } from '@khulnasoft/ai-context';
import { Logger } from '@khulnasoft/logging';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { IDocContext } from '../../document_transformer_service';
import { DefaultPreProcessorPipeline, PreProcessor } from './pre_processor_pipeline';

describe('PreProcessorPipeline', () => {
  let pipeline: DefaultPreProcessorPipeline;
  let mockProcessor1: PreProcessor;
  let mockProcessor2: PreProcessor;
  let mockContext: IDocContext;
  let mockContextItem: AIContextItem;
  let mockLogger: Logger;
  beforeEach(() => {
    mockProcessor1 = createFakePartial<PreProcessor>({
      process: jest.fn(),
    });
    mockProcessor2 = createFakePartial<PreProcessor>({
      process: jest.fn(),
    });
    mockContext = createFakePartial<IDocContext>({});
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

    mockLogger = createFakePartial<Logger>({
      warn: jest.fn(),
    });

    pipeline = new DefaultPreProcessorPipeline(mockLogger, [mockProcessor1, mockProcessor2]);
  });

  describe('run', () => {
    it('returns input unchanged when no processors are added', async () => {
      const emptyPipeline = new DefaultPreProcessorPipeline(mockLogger, []);
      const input = [mockContextItem];
      const result = await emptyPipeline.run({
        documentContext: mockContext,
        aiContextItems: input,
      });
      expect(result).toEqual({ documentContext: mockContext, aiContextItems: input });
    });

    it('processes input through all processors in order', async () => {
      const input = [mockContextItem];
      const processedByFirst = [{ ...mockContextItem, id: 'processed-1' }];
      const processedBySecond = [{ ...mockContextItem, id: 'processed-2' }];

      jest.mocked(mockProcessor1.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: processedByFirst },
      });
      jest.mocked(mockProcessor2.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: processedBySecond },
      });

      const result = await pipeline.run({
        documentContext: mockContext,
        aiContextItems: input,
      });

      expect(mockProcessor1.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input,
      });
      expect(mockProcessor2.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: processedByFirst,
      });
      expect(result).toEqual({ documentContext: mockContext, aiContextItems: processedBySecond });
    });

    it('handles empty input array', async () => {
      jest.mocked(mockProcessor1.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: [] },
      });
      jest.mocked(mockProcessor2.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: [] },
      });

      const result = await pipeline.run({
        documentContext: mockContext,
        aiContextItems: [],
      });

      expect(mockProcessor1.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: [],
      });
      expect(mockProcessor2.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: [],
      });
      expect(result).toEqual({ documentContext: mockContext, aiContextItems: [] });
    });

    it('processes multiple items correctly', async () => {
      const input = [mockContextItem, { ...mockContextItem, id: 'test-id-2' }];
      const processedByFirst = input.map((item) => ({ ...item, content: 'processed-1' }));
      const processedBySecond = input.map((item) => ({ ...item, content: 'processed-2' }));

      jest.mocked(mockProcessor1.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: processedByFirst },
      });
      jest.mocked(mockProcessor2.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: processedBySecond },
      });

      const result = await pipeline.run({
        documentContext: mockContext,
        aiContextItems: input,
      });

      expect(mockProcessor1.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input,
      });
      expect(mockProcessor2.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: processedByFirst,
      });
      expect(result).toEqual({ documentContext: mockContext, aiContextItems: processedBySecond });
    });

    it('handles processor that returns empty array', async () => {
      const input = [mockContextItem];
      jest.mocked(mockProcessor1.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: [] },
      });
      jest.mocked(mockProcessor2.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: [] },
      });

      const result = await pipeline.run({
        documentContext: mockContext,
        aiContextItems: input,
      });

      expect(mockProcessor1.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input,
      });
      expect(mockProcessor2.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: [],
      });
      expect(result).toEqual({ documentContext: mockContext, aiContextItems: [] });
    });

    it('throws error when processor returns fatal error', async () => {
      const input = [mockContextItem];
      const fatalError = new Error('Fatal error occurred');

      jest.mocked(mockProcessor1.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: input },
        error: {
          type: 'fatal',
          error: fatalError,
        },
      });

      await expect(
        pipeline.run({
          documentContext: mockContext,
          aiContextItems: input,
        }),
      ).rejects.toThrow(fatalError);

      expect(mockProcessor1.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input,
      });
      expect(mockProcessor2.process).not.toHaveBeenCalled();
    });

    it('continues processing when processor returns continue error', async () => {
      const input = [mockContextItem];
      const continueError = new Error('Non-fatal error occurred');
      const processedBySecond = [{ ...mockContextItem, id: 'processed-2' }];

      jest.mocked(mockProcessor1.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: input },
        error: {
          type: 'continue',
          error: continueError,
        },
      });
      jest.mocked(mockProcessor2.process).mockResolvedValue({
        preProcessorItems: { documentContext: mockContext, aiContextItems: processedBySecond },
      });

      const result = await pipeline.run({
        documentContext: mockContext,
        aiContextItems: input,
      });

      expect(mockProcessor1.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input,
      });
      expect(mockProcessor2.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[PreProcessorPipeline] pre-processor encountered an error but chose to continue',
        {
          processorName: mockProcessor1.constructor.name,
          error: continueError,
        },
      );
      expect(result).toEqual({ documentContext: mockContext, aiContextItems: processedBySecond });
    });

    it('properly chains modifications through multiple processors', async () => {
      const input = [mockContextItem];

      jest.mocked(mockProcessor1.process).mockImplementation(async (items) => ({
        preProcessorItems: {
          documentContext: mockContext,
          aiContextItems: items.aiContextItems.map((item) => ({
            ...item,
            field1: 'value1',
            metadata: { ...item.metadata, processed1: true },
          })),
        },
      }));

      jest.mocked(mockProcessor2.process).mockImplementation(async (items) => ({
        preProcessorItems: {
          documentContext: mockContext,
          aiContextItems: items.aiContextItems.map((item) => ({
            ...item,
            field1: `${(item as unknown as Record<string, string>).field1}_modified`,
            field2: 'value2',
            metadata: { ...item.metadata, processed2: true },
          })),
        },
      }));

      const result = await pipeline.run({
        documentContext: mockContext,
        aiContextItems: input,
      });

      expect(mockProcessor1.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input,
      });

      expect(mockProcessor2.process).toHaveBeenCalledWith({
        documentContext: mockContext,
        aiContextItems: input.map((item) => ({
          ...item,
          field1: 'value1',
          metadata: { ...item.metadata, processed1: true },
        })),
      });

      expect(result).toEqual({
        documentContext: mockContext,
        aiContextItems: input.map((item) => ({
          ...item,
          field1: 'value1_modified',
          field2: 'value2',
          metadata: {
            ...item.metadata,
            processed1: true,
            processed2: true,
          },
        })),
      });
    });
  });
});

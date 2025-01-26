import { createCollectionId, createInterfaceId, Injectable } from '@khulnasoft/di';
import { AIContextItem } from '@khulnasoft/ai-context';
import { Logger, withPrefix } from '@khulnasoft/logging';
import { IDocContext } from '../../document_transformer_service';

export type PreProcessorItems = {
  documentContext: IDocContext;
  aiContextItems: AIContextItem[];
};

/**
 * PreProcessor is an interface for classes that can be used to preprocess both
 * the main document (`IDocContext`) and the AI context items (`AIContextItem[]`)
 * before they are used for generating suggestions.
 * They are run in order according to the order they are added to the PreProcessorPipeline.
 */
export interface PreProcessor {
  process(items: PreProcessorItems): Promise<{
    preProcessorItems: PreProcessorItems;
    error?: {
      type: 'fatal' | 'continue';
      error: Error;
    };
  }>;
}

export interface PreProcessorPipeline extends DefaultPreProcessorPipeline {}

// Generic PreProcessor interface ID cannot handle contravariant parameters and covariant returns properly in DI registration

export const PreProcessor = createInterfaceId<PreProcessor>('PreProcessor');
export const PreProcessorCollection = createCollectionId(PreProcessor);
export const PreProcessorPipeline = createInterfaceId<PreProcessorPipeline>('PreProcessorPipeline');

/**
 * Pipeline for running pre-processors on AI context items.
 * Pre-processors are used to modify context items before they are used for generating suggestions.
 * They can be used to filter, sort, or modify context items.
 */
@Injectable(PreProcessorPipeline, [Logger, PreProcessorCollection])
export class DefaultPreProcessorPipeline implements PreProcessorPipeline {
  readonly #logger: Logger;

  readonly #processors: PreProcessor[];

  constructor(logger: Logger, processors: PreProcessor[]) {
    this.#logger = withPrefix(logger, '[PreProcessorPipeline]');
    this.#processors = processors;
  }

  async run(items: PreProcessorItems): Promise<PreProcessorItems> {
    if (!this.#processors.length) return items;

    return this.#processors.reduce<Promise<PreProcessorItems>>(async (prevPromise, processor) => {
      const result = await prevPromise;
      const { preProcessorItems, error } = await processor.process(result);
      if (error?.type === 'fatal') {
        throw error.error;
      }
      if (error?.type === 'continue') {
        this.#logger.warn('pre-processor encountered an error but chose to continue', {
          processorName: processor.constructor.name,
          error: error.error,
        });
      }
      return preProcessorItems;
    }, Promise.resolve(items));
  }
}

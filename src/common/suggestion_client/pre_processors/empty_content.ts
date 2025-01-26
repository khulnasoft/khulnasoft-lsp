import { Injectable } from '@khulnasoft/di';
import { AIContextItem } from '@khulnasoft/ai-context';
import { log } from '../../log';
import { PreProcessor, PreProcessorItems } from './pre_processor_pipeline';

export const emptyContentLog = ({ resolutionId }: { resolutionId: string }) => {
  return `Resolution ${resolutionId} has empty content, skipping`;
};

@Injectable(PreProcessor, [])
export class EmptyContentPreProcessor implements PreProcessor {
  async process(items: PreProcessorItems) {
    const isEmpty = (content: string) => content.replace(/\s/g, '') === '';
    const filteredResolutions: AIContextItem[] = [];
    for (const resolution of items.aiContextItems) {
      if (isEmpty(resolution.content ?? '')) {
        log.debug(emptyContentLog({ resolutionId: resolution.id }));
      } else {
        filteredResolutions.push(resolution);
      }
    }

    return { preProcessorItems: { ...items, aiContextItems: filteredResolutions } };
  }
}

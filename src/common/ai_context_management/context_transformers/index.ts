import { createInterfaceId } from '@khulnasoft/di';
import type { AIContextItem } from '@khulnasoft/ai-context';

export interface AiContextTransformer {
  transform(context: AIContextItem): Promise<AIContextItem>;
}

export const AiContextTransformer = createInterfaceId<AiContextTransformer>('AiContextTransformer');

import { Injectable } from '@khulnasoft/di';
import { AIContextItem } from '@khulnasoft/ai-context';
import { getByteSize, truncateToByteLimit } from '../../utils/byte_size';
import { log } from '../../log';
import { PreProcessor, PreProcessorItems } from './pre_processor_pipeline';

export enum ByteSizeLimitLogType {
  DocumentTrimmed = 'document',
  ResolutionTrimmed = 'resolution',
  LimitExceeded = 'exceeded',
}

export const byteSizeLimitLog = (
  type: ByteSizeLimitLogType,
  params?: {
    documentSize?: number;
    byteSizeLimit?: number;
    resolutionId?: string;
    contentSize?: number;
  },
) => {
  switch (type) {
    case ByteSizeLimitLogType.DocumentTrimmed:
      return `Document content trimmed to fit byte size limit: document size: ${params?.documentSize} bytes, limit: ${params?.byteSizeLimit} bytes`;
    case ByteSizeLimitLogType.ResolutionTrimmed:
      return `Resolution content trimmed to fit byte size limit: resolution id: ${params?.resolutionId}, content size: ${params?.contentSize} bytes`;
    case ByteSizeLimitLogType.LimitExceeded:
      return `Byte size limit exceeded. No space remaining for content.`;
    default:
      return `Unknown byte size limit log type: ${type}`;
  }
};

/**
 * This is the maximum byte size of the content that can be sent to the Code Suggestions API.
 * This includes the content of the document and the context resolutions.
 */
export const CODE_SUGGESTIONS_REQUEST_BYTE_SIZE_LIMIT = 50000; // 50KB

@Injectable(PreProcessor, [])
export class ByteSizeLimitPreProcessor implements PreProcessor {
  readonly #byteSizeLimit: number;

  constructor() {
    this.#byteSizeLimit = CODE_SUGGESTIONS_REQUEST_BYTE_SIZE_LIMIT;
  }

  async process(items: PreProcessorItems) {
    try {
      const documentSize = getByteSize(
        `${items.documentContext.prefix}${items.documentContext.suffix}`,
      );
      let currentTotalSize = documentSize;
      const filteredResolutions: AIContextItem[] = [];

      if (currentTotalSize > this.#byteSizeLimit) {
        const trimmedDocument = truncateToByteLimit(
          items.documentContext.suffix,
          this.#byteSizeLimit - documentSize,
        );
        log.debug(
          byteSizeLimitLog(ByteSizeLimitLogType.DocumentTrimmed, {
            documentSize,
            byteSizeLimit: this.#byteSizeLimit,
          }),
        );
        return {
          preProcessorItems: {
            documentContext: { ...items.documentContext, suffix: trimmedDocument },
            aiContextItems: [],
          },
        };
      }

      for (const resolution of items.aiContextItems) {
        const resolutionBuffer = Buffer.from(resolution.content ?? '');
        const wouldExceedLimit = currentTotalSize + resolutionBuffer.length > this.#byteSizeLimit;

        if (wouldExceedLimit) {
          const remainingSpace = this.#byteSizeLimit - currentTotalSize;
          if (remainingSpace <= 0) {
            log.debug(byteSizeLimitLog(ByteSizeLimitLogType.LimitExceeded));
            break;
          }

          const trimmedContent = resolutionBuffer.slice(0, remainingSpace).toString();
          if (trimmedContent.length) {
            log.debug(
              byteSizeLimitLog(ByteSizeLimitLogType.ResolutionTrimmed, {
                resolutionId: resolution.id,
                contentSize: getByteSize(trimmedContent),
              }),
            );
            filteredResolutions.push({ ...resolution, content: trimmedContent });
          }
          break;
        }

        currentTotalSize += resolutionBuffer.length;
        filteredResolutions.push(resolution);
      }
      return { preProcessorItems: { ...items, aiContextItems: filteredResolutions } };
    } catch (error) {
      return {
        preProcessorItems: {
          documentContext: items.documentContext,
          aiContextItems: [],
        },
        error: {
          type: 'continue' as const,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      };
    }
  }
}

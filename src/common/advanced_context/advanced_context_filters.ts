import { WorkspaceFolder } from 'vscode-languageserver-protocol';
import { AIContextItem } from '@khulnasoft/ai-context';
import { IDocContext } from '../document_transformer_service';
import { log } from '../log';
import { DuoProjectAccessChecker } from '../services/duo_access';
import { DuoProjectStatus } from '../services/duo_access/project_access_checker';
import { SupportedLanguagesService } from '../suggestion/supported_languages_service';
import { getByteSize } from '../utils/byte_size';
import { languageNotEnabledLog } from '../suggestion_client/pre_processors/supported_language';
import {
  byteSizeLimitLog,
  ByteSizeLimitLogType,
} from '../suggestion_client/pre_processors/byte_size_limit';
import { emptyContentLog } from '../suggestion_client/pre_processors/empty_content';

type AdvancedContextFilterArgs = {
  contextResolutions: AIContextItem[];
  documentContext: IDocContext;
  byteSizeLimit: number;
  dependencies: {
    duoProjectAccessChecker: DuoProjectAccessChecker;
    supportedLanguagesService: SupportedLanguagesService;
  };
};

type AdvanceContextFilter = (args: AdvancedContextFilterArgs) => Promise<AIContextItem[]>;

/**
 * Filters context resolutions that have empty content.
 */
const emptyContentFilter = async ({ contextResolutions }: AdvancedContextFilterArgs) => {
  const results: AIContextItem[] = [];
  const isEmpty = (content: string) => content.replace(/\s/g, '') === '';
  for (const resolution of contextResolutions) {
    if (isEmpty(resolution.content ?? '')) {
      log.debug(emptyContentLog({ resolutionId: resolution.id }));
    } else {
      results.push(resolution);
    }
  }
  return results;
};

/**
 * Filters context resolutions that
 * contain a Duo project that have Duo features enabled.
 * See `DuoProjectAccessChecker` for more details.
 */
const duoProjectAccessFilter: AdvanceContextFilter = async ({
  contextResolutions,
  dependencies: { duoProjectAccessChecker },
  documentContext,
}: AdvancedContextFilterArgs) => {
  if (!documentContext?.workspaceFolder) {
    log.debug('Advanced Context Filter: No workspace folder, skipping duo project access filter');
    return contextResolutions;
  }
  return contextResolutions.reduce((acc, resolution) => {
    const { id: resolutionUri } = resolution;

    const { status } = duoProjectAccessChecker.checkProjectStatus(
      resolutionUri,
      documentContext.workspaceFolder as WorkspaceFolder,
    );
    if (status === DuoProjectStatus.DuoDisabled) {
      log.warn(`Advanced Context Filter: duo features are not enabled for ${resolutionUri}`);
      return acc;
    }
    return [...acc, resolution];
  }, [] as AIContextItem[]);
};

/**
 * Filters context resolutions that meet the byte size limit.
 * The byte size limit takes into the size of the total
 * context resolutions content + size of document content.
 */
const byteSizeLimitFilter: AdvanceContextFilter = async ({
  contextResolutions,
  documentContext,
  byteSizeLimit,
}: AdvancedContextFilterArgs) => {
  const documentSize = getByteSize(`${documentContext.prefix}${documentContext.suffix}`);

  let currentTotalSize = documentSize;

  const filteredResolutions: AIContextItem[] = [];

  for (const resolution of contextResolutions) {
    currentTotalSize += getByteSize(resolution.content ?? '');
    if (currentTotalSize > byteSizeLimit) {
      // trim the current resolution content to fit the byte size limit
      const trimmedContent = Buffer.from(resolution.content ?? '')
        .slice(0, byteSizeLimit - currentTotalSize)
        .toString();
      if (trimmedContent.length) {
        log.debug(
          byteSizeLimitLog(ByteSizeLimitLogType.ResolutionTrimmed, {
            resolutionId: resolution.id,
            contentSize: trimmedContent.length,
          }),
        );
        filteredResolutions.push({ ...resolution, content: trimmedContent });
      }
      log.debug(byteSizeLimitLog(ByteSizeLimitLogType.LimitExceeded));
      break;
    }
    filteredResolutions.push(resolution);
  }
  return filteredResolutions;
};

const supportedLanguageFilter: AdvanceContextFilter = async ({
  contextResolutions,
  dependencies: { supportedLanguagesService },
}: AdvancedContextFilterArgs) => {
  return contextResolutions.filter((resolution) => {
    if (resolution.category !== 'file' || !resolution.metadata?.languageId) {
      // Not a file with a languageId we can check, so this filter doesn't apply
      return true;
    }

    const languageEnabled = supportedLanguagesService.isLanguageEnabled(
      resolution.metadata?.languageId,
    );
    if (!languageEnabled) {
      log.debug(
        languageNotEnabledLog({
          languageId: resolution.metadata?.languageId,
          resolutionId: resolution.id,
        }),
      );
      return false;
    }
    return true;
  });
};

/**
 * Advanced context filters that are applied to context resolutions.
 * @see filterContextResolutions
 */
const advancedContextFilters: AdvanceContextFilter[] = [
  emptyContentFilter,
  duoProjectAccessFilter,
  supportedLanguageFilter,
  byteSizeLimitFilter,
];

/**
 * Filters context resolutions based on business logic.
 * The filters are order dependent.
 * @see advancedContextFilters
 */
export const filterContextResolutions = async ({
  contextResolutions,
  dependencies,
  documentContext,
  byteSizeLimit,
}: AdvancedContextFilterArgs): Promise<AIContextItem[]> => {
  return advancedContextFilters.reduce(async (prevPromise, filter) => {
    const resolutions = await prevPromise;
    return filter({
      contextResolutions: resolutions,
      dependencies,
      documentContext,
      byteSizeLimit,
    });
  }, Promise.resolve(contextResolutions));
};

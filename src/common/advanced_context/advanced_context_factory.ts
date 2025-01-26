import { AIContextItem } from '@khulnasoft/ai-context';
import { AdditionalContext } from '../api_types';
import { IDocContext } from '../document_transformer_service';
import { log } from '../log';
import { DuoProjectAccessChecker } from '../services/duo_access';
import { SupportedLanguagesService } from '../suggestion/supported_languages_service';
import { CODE_SUGGESTIONS_REQUEST_BYTE_SIZE_LIMIT } from '../suggestion_client/pre_processors/byte_size_limit';
import { AdvancedContextResolver } from './context_resolvers/advanced_context_resolver';
import { OpenTabsResolver } from './context_resolvers/open_tabs_context_resolver';
import { filterContextResolutions } from './advanced_context_filters';

type AdvancedContextResolverFactory = () => AdvancedContextResolver;

const advancedContextResolverFactories: AdvancedContextResolverFactory[] = [
  OpenTabsResolver.getInstance,
];

export const getAdvancedContext = async ({
  documentContext,
  dependencies: { duoProjectAccessChecker, supportedLanguagesService },
}: {
  documentContext: IDocContext;
  dependencies: {
    duoProjectAccessChecker: DuoProjectAccessChecker;
    supportedLanguagesService: SupportedLanguagesService;
  };
}): Promise<AIContextItem[]> => {
  try {
    const resolvers = advancedContextResolverFactories.map((factory) => factory());
    const resolutions: AIContextItem[] = [];
    for (const resolver of resolvers) {
      // eslint-disable-next-line no-await-in-loop
      for await (const resolution of resolver.buildContext({ documentContext })) {
        resolutions.push(resolution);
      }
    }
    const filteredResolutions = await filterContextResolutions({
      contextResolutions: resolutions,
      documentContext,
      dependencies: { duoProjectAccessChecker, supportedLanguagesService },
      byteSizeLimit: CODE_SUGGESTIONS_REQUEST_BYTE_SIZE_LIMIT,
    });
    log.debug(
      `[AdvancedContextResolverFactory] using ${filteredResolutions.length} context resolutions `,
    );
    return filteredResolutions;
  } catch (e) {
    log.error('[AdvancedContextResolverFactory] Error while getting advanced context', e);
    return [];
  }
};

/**
 * Maps `ContextResolution` to the request body format `AdditionalContext`.
 * Note: We intentionally keep these two separate to avoid coupling the request body
 * format to the advanced context resolver internal data.
 */
export function advancedContextToRequestBody(
  advancedContext: AIContextItem[],
): AdditionalContext[] {
  return advancedContext.map((ac) => ({
    type: ac.category as 'file' | 'snippet',
    name: ac.id,
    content: ac.content ?? '',
    resolution_strategy: 'open_tabs',
  }));
}

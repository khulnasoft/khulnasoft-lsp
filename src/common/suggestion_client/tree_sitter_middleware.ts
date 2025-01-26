import { log } from '../log';
import type { TreeAndLanguage, TreeSitterParser, getIntent } from '../tree_sitter';
import type { SuggestionClientMiddleware } from './suggestion_client';

export const createTreeSitterMiddleware =
  ({
    treeSitterParser,
    getIntentFn,
  }: {
    treeSitterParser: TreeSitterParser;
    getIntentFn: typeof getIntent;
  }): SuggestionClientMiddleware =>
  async (context, next) => {
    if (context.intent) {
      return next(context);
    }
    let treeAndLanguage: TreeAndLanguage | undefined;
    try {
      treeAndLanguage = await treeSitterParser.parseFile(context.document);
    } catch (err) {
      log.warn('Error determining user intent for code suggestion request.', err);
    }
    if (!treeAndLanguage) {
      return next(context);
    }
    const { intent } = await getIntentFn({
      treeAndLanguage,
      position: context.document.position,
      prefix: context.document.prefix,
      suffix: context.document.suffix,
    });
    return next({ ...context, intent });
  };

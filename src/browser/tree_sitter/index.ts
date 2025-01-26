import { Injectable } from '@khulnasoft/di';
import Parser from 'web-tree-sitter';
import { ConfigService } from '../../common';
import { log } from '../../common/log';
import {
  COMMON_TREE_SITTER_LANGUAGES,
  AbstractTreeSitterParser,
  TreeSitterParser,
  TreeSitterParserLoadState,
  TreeSitterLanguageInfo,
} from '../../common/tree_sitter';

const resolveGrammarAbsoluteUrl = (relativeUrl: string, baseAssetsUrl: string = ''): string => {
  return new URL(relativeUrl, baseAssetsUrl).href;
};

@Injectable(TreeSitterParser, [ConfigService])
export class BrowserTreeSitterParser extends AbstractTreeSitterParser {
  #configService: ConfigService;

  constructor(configService: ConfigService) {
    super({ languages: [] });
    this.#configService = configService;
  }

  getLoadState() {
    return this.loadState;
  }

  getLanguages(): {
    byExtension: Map<string, TreeSitterLanguageInfo>;
    byLanguageId: Map<string, TreeSitterLanguageInfo>;
  } {
    return this.languages;
  }

  async init(): Promise<void> {
    const baseAssetsUrl = this.#configService.get('client.baseAssetsUrl');

    this.languages = AbstractTreeSitterParser.buildTreeSitterInfoByLangAndExtMap(
      COMMON_TREE_SITTER_LANGUAGES.map((definition) => ({
        ...definition,
        wasmPath: resolveGrammarAbsoluteUrl(definition.wasmPath, baseAssetsUrl),
      })),
    );

    try {
      await Parser.init({
        locateFile(scriptName: string) {
          return resolveGrammarAbsoluteUrl(`node/${scriptName}`, baseAssetsUrl);
        },
      });
      log.debug('BrowserTreeSitterParser: Initialized tree-sitter parser.');
      this.loadState = TreeSitterParserLoadState.READY;
    } catch (err) {
      log.warn('BrowserTreeSitterParser: Error initializing tree-sitter parsers.', err);
      this.loadState = TreeSitterParserLoadState.ERRORED;
    }
  }
}

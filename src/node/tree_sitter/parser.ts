import { Injectable } from '@khulnasoft/di';
import Parser from 'web-tree-sitter';
import { log } from '../../common/log';
import {
  TreeSitterParser,
  AbstractTreeSitterParser,
  TreeSitterParserLoadState,
} from '../../common/tree_sitter';
import { TREE_SITTER_LANGUAGES } from './languages';

@Injectable(TreeSitterParser, [])
export class DesktopTreeSitterParser extends AbstractTreeSitterParser {
  constructor() {
    super({
      languages: TREE_SITTER_LANGUAGES,
    });
  }

  async init(): Promise<void> {
    try {
      await Parser.init();
      log.debug('DesktopTreeSitterParser: Initialized tree-sitter parser.');
      this.loadState = TreeSitterParserLoadState.READY;
    } catch (err) {
      log.warn('DesktopTreeSitterParser: Error initializing tree-sitter parsers.', err);
      this.loadState = TreeSitterParserLoadState.ERRORED;
    }
  }
}

import Parser = require('web-tree-sitter');
import { ConfigService, DefaultConfigService } from '../../common';
import { TreeSitterParserLoadState } from '../../common/tree_sitter';
import { BrowserTreeSitterParser } from './index';

jest.mock('web-tree-sitter');

type ParserInitOptions = { locateFile: (scriptName: string) => string };

describe('BrowserTreeSitterParser', () => {
  let subject: BrowserTreeSitterParser;
  let configService: ConfigService;
  const baseAssetsUrl = 'http://localhost/assets/tree-sitter/';

  describe('init', () => {
    beforeEach(async () => {
      configService = new DefaultConfigService();
      configService.set('client.baseAssetsUrl', baseAssetsUrl);

      subject = new BrowserTreeSitterParser(configService);
    });

    it('initializes languages list with correct wasmPath', async () => {
      await subject.init();

      const { byExtension, byLanguageId } = subject.getLanguages();

      for (const [, treeSitterLangInfo] of byExtension) {
        expect(treeSitterLangInfo.wasmPath).toContain(baseAssetsUrl);
      }
      for (const [, treeSitterLangInfo] of byLanguageId) {
        expect(treeSitterLangInfo.wasmPath).toContain(baseAssetsUrl);
      }
    });

    it('initializes the Treesitter parser with a locateFile function', async () => {
      let options: ParserInitOptions | undefined;

      jest.mocked(Parser.init).mockImplementationOnce(async (_options?: object) => {
        options = _options as ParserInitOptions;
      });

      await subject.init();

      expect(options?.locateFile).toBeDefined();
      expect(options?.locateFile('tree-sitter.wasm')).toBe(`${baseAssetsUrl}node/tree-sitter.wasm`);
    });

    it.each`
      initCall                                                             | loadState
      ${() => jest.mocked(Parser.init).mockResolvedValueOnce()}            | ${TreeSitterParserLoadState.READY}
      ${() => jest.mocked(Parser.init).mockRejectedValueOnce(new Error())} | ${TreeSitterParserLoadState.ERRORED}
    `('sets the correct parser load state', async ({ initCall, loadState }) => {
      initCall();

      await subject.init();

      expect(subject.getLoadState()).toBe(loadState);
    });
  });
});

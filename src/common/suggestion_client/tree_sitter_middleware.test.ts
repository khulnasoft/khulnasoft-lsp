import type { Language, Tree } from 'web-tree-sitter';
import Parser from 'web-tree-sitter';
import { createFakePartial } from '../test_utils/create_fake_partial';
import type {
  IntentResolution,
  TreeAndLanguage,
  TreeSitterParser,
  getIntent,
} from '../tree_sitter';
import type {
  SuggestionClientFn,
  SuggestionClientMiddleware,
  SuggestionContext,
  SuggestionResponse,
} from './suggestion_client';
import { createTreeSitterMiddleware } from './tree_sitter_middleware';

describe('common/suggestion_client/tree_sitter_middleware', () => {
  let next: SuggestionClientFn;
  let subject: SuggestionClientMiddleware;
  let mockTreeSitterParser: TreeSitterParser;
  let getIntentFn: typeof getIntent;

  beforeEach(() => {
    next = jest.fn().mockResolvedValue(createFakePartial<SuggestionResponse>({ status: 1 }));
    mockTreeSitterParser = {
      parseFile: jest.fn().mockResolvedValue({
        languageInfo: {
          name: 'typescript',
          extensions: ['.ts'],
          wasmPath: 'some/path/to/wasm',
          nodeModulesPath: 'some/path/to/node_modules',
          editorLanguageIds: ['typescript'],
        },
        language: createFakePartial<Language>({}),
        parser: {} as unknown as Parser,
        tree: {} as unknown as Tree,
      } satisfies TreeAndLanguage),
    } as unknown as TreeSitterParser;
    getIntentFn = jest.fn();
    subject = createTreeSitterMiddleware({
      treeSitterParser: mockTreeSitterParser,
      getIntentFn,
    });
  });

  describe('createTreeSitterMiddleware', () => {
    it('does not parse document when intent is already set', async () => {
      const context: SuggestionContext = {
        document: {
          fileRelativePath: 'generation.ts',
          prefix: '// Create a class named after a tanuki.',
          suffix: '',
          position: {
            line: 0,
            character: 40,
          },
          uri: 'file:///generation.ts',
          languageId: 'javascript',
        },
        intent: 'completion',
      };
      jest
        .mocked(getIntentFn)
        .mockResolvedValue(createFakePartial<IntentResolution>({ intent: 'generation' }));

      await subject(context, next);

      expect(getIntentFn).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ intent: 'completion' }));
    });

    it('parses document to determine intent', async () => {
      const context: SuggestionContext = {
        document: {
          fileRelativePath: 'generation.ts',
          prefix: '// Create a class named after a tanuki.',
          suffix: '',
          position: {
            line: 0,
            character: 39,
          },
          uri: 'file:///generation.ts',
          languageId: 'javascript',
        },
      };
      jest
        .mocked(getIntentFn)
        .mockResolvedValue(createFakePartial<IntentResolution>({ intent: 'generation' }));
      await subject(context, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ intent: 'generation' }));
    });
  });
});

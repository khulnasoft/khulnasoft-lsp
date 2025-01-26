import { CodeSuggestionResponse, KhulnaSoftApiClient } from '../api';
import { IDocContext } from '../document_transformer_service';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { SuggestionContext } from './suggestion_client';
import { DefaultSuggestionClient } from './default_suggestion_client';

const TEST_SUGGESTION_RESPONSE = createFakePartial<CodeSuggestionResponse>({
  choices: [],
});
const TEST_CONTEXT: SuggestionContext = {
  document: createFakePartial<IDocContext>({
    fileRelativePath: 'test.md',
    prefix: 'prefix-content',
    suffix: 'suffix-content',
  }),
  projectPath: 'gitlab-org/editor-extensions/khulnasoft-lsp',
};

describe('DefaultSuggestionClient', () => {
  let api: KhulnaSoftApiClient;
  let subject: DefaultSuggestionClient;

  beforeEach(() => {
    api = createFakePartial<KhulnaSoftApiClient>({
      getCodeSuggestions: jest.fn().mockResolvedValue(TEST_SUGGESTION_RESPONSE),
    });

    subject = new DefaultSuggestionClient(api);
  });

  describe('getSuggestions', () => {
    it('passes through to monolith api', async () => {
      const result = await subject.getSuggestions(TEST_CONTEXT);

      expect(result).toEqual(expect.objectContaining(TEST_SUGGESTION_RESPONSE));
      expect(api.getCodeSuggestions).toHaveBeenCalledWith({
        prompt_version: 1,
        project_path: TEST_CONTEXT.projectPath,
        project_id: -1,
        current_file: {
          content_above_cursor: 'prefix-content',
          content_below_cursor: 'suffix-content',
          file_name: 'test.md',
        },
      });
    });

    it('passes through intent if provided', async () => {
      await subject.getSuggestions({
        ...TEST_CONTEXT,
        intent: 'completion',
      });

      expect(api.getCodeSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'completion',
        }),
      );
    });

    it('adds isDirectConnection: false to the response', async () => {
      const result = await subject.getSuggestions(TEST_CONTEXT);

      expect(result).toEqual(expect.objectContaining({ isDirectConnection: false }));
    });
  });
});

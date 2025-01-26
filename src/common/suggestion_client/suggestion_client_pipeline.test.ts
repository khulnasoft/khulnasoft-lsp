import { createFakePartial } from '../test_utils/create_fake_partial';
import {
  SuggestionClientFn,
  SuggestionClientMiddleware,
  SuggestionContext,
  SuggestionResponse,
} from './suggestion_client';
import { SuggestionClientPipeline } from './suggestion_client_pipeline';

const TEST_SUGGESTION_RESPONSE = createFakePartial<SuggestionResponse>({
  status: 1,
});

const TEST_CONTEXT: SuggestionContext = {
  document: {
    fileRelativePath: 'test.md',
    prefix: 'test prefiex',
    suffix: 'test suffix',
    position: {
      line: 0,
      character: 12,
    },
    uri: 'file:///test.md',
    workspaceFolder: {
      uri: 'file:///',
      name: 'test',
    },
    languageId: 'javascript',
  },
  projectPath: 'gitlab-org/editor-extensions/gitlab.vim',
};

describe('common/suggestion_client/suggestion_client_pipeline', () => {
  let subject: SuggestionClientPipeline;
  let middlewareSpy: jest.Mock<void, [string]>;
  let terminalMiddleware: SuggestionClientMiddleware;

  const createMiddleware =
    (name: string): SuggestionClientMiddleware =>
    async (context: SuggestionContext, next: SuggestionClientFn) => {
      middlewareSpy(`${name} - before`);
      const result = await next(context);
      middlewareSpy(`${name} - after`);
      return result;
    };

  beforeEach(() => {
    middlewareSpy = jest.fn();
    terminalMiddleware = jest.fn().mockImplementation(() => {
      middlewareSpy('terminal');

      return Promise.resolve(TEST_SUGGESTION_RESPONSE);
    });

    subject = new SuggestionClientPipeline([
      terminalMiddleware,
      createMiddleware('1st middleware'),
      createMiddleware('2nd middleware'),
    ]);
  });

  it('calls pipeline of middlewares to transform handle request / response', async () => {
    expect(middlewareSpy).not.toHaveBeenCalled();

    const result = await subject.getSuggestions(TEST_CONTEXT);

    expect(result).toBe(TEST_SUGGESTION_RESPONSE);
    expect(middlewareSpy.mock.calls.flatMap((x) => x)).toEqual([
      '2nd middleware - before',
      '1st middleware - before',
      'terminal',
      '1st middleware - after',
      '2nd middleware - after',
    ]);
  });

  describe('when middleware is added after creation', () => {
    beforeEach(() => {
      subject.use(createMiddleware('3rd middleware'));
    });

    it('wraps new middleware around existing pipeline', async () => {
      expect(middlewareSpy).not.toHaveBeenCalled();

      await subject.getSuggestions(TEST_CONTEXT);

      expect(middlewareSpy.mock.calls.flatMap((x) => x)).toEqual([
        '3rd middleware - before',
        '2nd middleware - before',
        '1st middleware - before',
        'terminal',
        '1st middleware - after',
        '2nd middleware - after',
        '3rd middleware - after',
      ]);
    });
  });

  describe('without terminal middleware', () => {
    beforeEach(() => {
      subject = new SuggestionClientPipeline([createMiddleware('1st middleware')]);
    });

    it('throws middleware', async () => {
      await expect(subject.getSuggestions(TEST_CONTEXT)).rejects.toThrowError(
        '[SuggestionClientPipeline] Reached end of the pipeline without resolution!',
      );
    });
  });
});

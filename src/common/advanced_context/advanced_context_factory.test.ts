import { SupportedLanguagesService } from '../suggestion/supported_languages_service';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { IDocContext } from '../document_transformer_service';
import { DuoProjectAccessChecker } from '../services/duo_access';
import type { OpenTabAIContextItem } from '../ai_context_management/context_providers/open_tabs/open_tabs_provider';
import { advancedContextToRequestBody, getAdvancedContext } from './advanced_context_factory';
import { OpenTabsResolver } from './context_resolvers/open_tabs_context_resolver';

jest.mock('./context_resolvers/open_tabs_context_resolver');

describe('advanced_context_factory', () => {
  describe('advancedContextToAdditionalContext', () => {
    it('should convert advanced context to additional context with the correct properties', () => {
      const advancedContext: OpenTabAIContextItem[] = [
        {
          content: 'file1 content',
          category: 'file',
          id: 'file://path/to/file1.ts',
          metadata: {
            languageId: 'typescript',
            title: 'file1.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            relativePath: 'file1.ts',
            secondaryText: 'file1 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
        {
          category: 'file',
          content: 'file2 content',
          id: 'file://path/to/file2.ts',
          metadata: {
            languageId: 'typescript',
            title: 'file2.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            relativePath: 'file2.ts',
            secondaryText: 'file2 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
      ];

      const result = advancedContextToRequestBody(advancedContext);

      expect(result).toEqual([
        {
          type: 'file',
          name: 'file://path/to/file1.ts',
          content: 'file1 content',
          resolution_strategy: 'open_tabs',
        },
        {
          type: 'file',
          name: 'file://path/to/file2.ts',
          content: 'file2 content',
          resolution_strategy: 'open_tabs',
        },
      ]);
    });
  });

  describe('getAdvancedContext', () => {
    it('should build the advanced context using the LRU resolver', async () => {
      const mockOpenTabsResolver = {
        buildContext: jest.fn().mockReturnValue([
          {
            uri: 'file1.ts',
            type: 'file',
            content: 'file1 content',
            fileRelativePath: 'file1.ts',
            strategy: 'open_tabs',
          },
        ]),
      };
      jest.mocked(OpenTabsResolver.getInstance).mockReturnValue(mockOpenTabsResolver);

      const documentContext = createFakePartial<IDocContext>({});
      const duoProjectAccessChecker = createFakePartial<DuoProjectAccessChecker>({});
      const supportedLanguagesService = createFakePartial<SupportedLanguagesService>({});

      const result = await getAdvancedContext({
        documentContext,
        dependencies: { duoProjectAccessChecker, supportedLanguagesService },
      });

      expect(OpenTabsResolver.getInstance).toHaveBeenCalled();
      expect(mockOpenTabsResolver.buildContext).toHaveBeenCalledWith({ documentContext });
      expect(result).toEqual([
        {
          uri: 'file1.ts',
          type: 'file',
          content: 'file1 content',
          fileRelativePath: 'file1.ts',
          strategy: 'open_tabs',
        },
      ]);
    });
  });
});

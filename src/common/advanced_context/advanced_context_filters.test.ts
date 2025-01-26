import { OpenTabAIContextItem } from '../ai_context_management/context_providers/open_tabs/open_tabs_provider';
import { IDocContext } from '../document_transformer_service';
import { DuoProjectAccessChecker } from '../services/duo_access';
import { DuoProjectStatus } from '../services/duo_access/project_access_checker';
import { SupportedLanguagesService } from '../suggestion/supported_languages_service';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { filterContextResolutions } from './advanced_context_filters';

jest.mock('../log', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('advanced_context_filters', () => {
  let duoProjectAccessChecker: DuoProjectAccessChecker;
  let supportedLanguagesService: SupportedLanguagesService;
  let dependencies: {
    duoProjectAccessChecker: DuoProjectAccessChecker;
    supportedLanguagesService: SupportedLanguagesService;
  };
  let documentContext: IDocContext;

  beforeEach(() => {
    duoProjectAccessChecker = createFakePartial<DuoProjectAccessChecker>({
      checkProjectStatus: jest.fn(),
    });
    supportedLanguagesService = createFakePartial<SupportedLanguagesService>({
      isLanguageEnabled: jest.fn(),
    });

    dependencies = { duoProjectAccessChecker, supportedLanguagesService };

    documentContext = {
      prefix: 'prefix',
      suffix: 'suffix',
      workspaceFolder: {
        uri: 'file:///workspace',
        name: 'test-workspace',
      },
    } as IDocContext;
  });

  describe('emptyContentFilter', () => {
    it('should filter out context resolutions with empty content', async () => {
      duoProjectAccessChecker.checkProjectStatus = jest
        .fn()
        .mockReturnValue({ status: DuoProjectStatus.DuoEnabled, project: undefined });
      supportedLanguagesService.isLanguageEnabled = jest.fn().mockReturnValue(true);
      const contextResolutions: OpenTabAIContextItem[] = [
        {
          category: 'file',
          id: 'file://path/to/file1.ts',
          content: 'content1',
          metadata: {
            languageId: 'typescript',
            title: 'file1.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
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
          id: 'file://path/to/file2.ts',
          content: '   ',
          metadata: {
            languageId: 'typescript',
            title: 'file2.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file2 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
        {
          category: 'file',
          id: 'file://path/to/file3.ts',
          content: 'content3',
          metadata: {
            languageId: 'typescript',
            title: 'file3.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file3 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
      ];

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext,
        byteSizeLimit: 500000,
      });
      expect(result).toEqual([contextResolutions[0], contextResolutions[2]]);
    });
  });

  describe('duoProjectAccessFilter', () => {
    it('should filter out context resolutions that do not have Duo features enabled', async () => {
      const contextResolutions: OpenTabAIContextItem[] = [
        {
          category: 'file',
          id: 'file://path/to/file1.ts',
          content: 'content1',
          metadata: {
            languageId: 'typescript',
            title: 'file1.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
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
          id: 'file://path/to/file2.ts',
          content: 'content2',
          metadata: {
            languageId: 'typescript',
            title: 'file2.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file2 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
      ];

      (duoProjectAccessChecker.checkProjectStatus as jest.Mock)
        .mockReturnValueOnce({ status: DuoProjectStatus.DuoEnabled, project: undefined })
        .mockReturnValueOnce({ status: DuoProjectStatus.DuoDisabled, project: undefined });

      supportedLanguagesService.isLanguageEnabled = jest.fn().mockReturnValue(true);

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext,
        byteSizeLimit: 500000,
      });

      expect(result).toEqual([contextResolutions[0]]);
    });

    it('should return all context resolutions if workspaceFolder is not defined', async () => {
      supportedLanguagesService.isLanguageEnabled = jest.fn().mockReturnValue(true);
      const contextResolutions: OpenTabAIContextItem[] = [
        {
          category: 'file',
          id: 'file://path/to/file1.ts',
          content: 'content1',
          metadata: {
            languageId: 'typescript',
            title: 'file1.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file1 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: undefined,
          },
        },
        {
          category: 'file',
          id: 'file://path/to/file2.ts',
          content: 'content2',
          metadata: {
            languageId: 'typescript',
            title: 'file2.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file2 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: undefined,
          },
        },
      ];

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext: { ...documentContext, workspaceFolder: undefined },
        byteSizeLimit: 500000,
      });

      expect(result).toEqual(contextResolutions);
    });
  });

  describe('byteSizeLimitFilter', () => {
    it('should filter out context resolutions that exceed the byte size limit', async () => {
      duoProjectAccessChecker.checkProjectStatus = jest
        .fn()
        .mockReturnValue({ status: DuoProjectStatus.DuoEnabled, project: undefined });
      supportedLanguagesService.isLanguageEnabled = jest.fn().mockReturnValue(true);
      const contextResolutions: OpenTabAIContextItem[] = [
        {
          category: 'file',
          id: 'file://path/to/file1.ts',
          content: 'a'.repeat(200000),
          metadata: {
            languageId: 'typescript',
            title: 'file1.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
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
          id: 'file://path/to/file2.ts',
          content: 'b'.repeat(400000),
          metadata: {
            languageId: 'typescript',
            title: 'file2.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file2 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
        {
          category: 'file',
          id: 'file://path/to/file3.ts',
          content: 'c'.repeat(100000),
          metadata: {
            languageId: 'typescript',
            title: 'file3.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file3 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
      ];

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext,
        byteSizeLimit: 500000,
      });

      expect(result.length).toBe(2);
    });
  });

  describe('supportedLanguageFilter', () => {
    let mockSnippet: OpenTabAIContextItem;
    let mockEnabledFile: OpenTabAIContextItem;
    let mockDisabledFile: OpenTabAIContextItem;

    beforeEach(() => {
      duoProjectAccessChecker.checkProjectStatus = jest
        .fn()
        .mockReturnValue({ status: DuoProjectStatus.DuoEnabled, project: undefined });

      mockEnabledFile = createFakePartial<OpenTabAIContextItem>({
        category: 'file',
        id: 'file://path/to/file1.ts',
        content: 'wow',
        metadata: {
          languageId: 'typescript',
          title: 'file1.ts',
          enabled: true,
          subType: 'open_tab',
          icon: 'file',
          secondaryText: 'file1 content',
          subTypeLabel: 'Open Tab',
        },
      });
      mockDisabledFile = createFakePartial<OpenTabAIContextItem>({
        category: 'file',
        id: 'file://path/to/file2.rb',
        content: 'ding',
        metadata: {
          languageId: 'ruby',
          title: 'file2.rb',
          enabled: false,
          subType: 'open_tab',
          icon: 'file',
          secondaryText: 'file2 content',
          subTypeLabel: 'Open Tab',
        },
      });
      mockSnippet = createFakePartial<OpenTabAIContextItem>({
        category: 'snippet' as 'file',
        id: 'snippet1',
        content: 'hi',
        metadata: {
          languageId: 'typescript',
          title: 'snippet1',
          enabled: true,
          subType: 'open_tab',
          icon: 'file',
          secondaryText: 'snippet1 content',
          subTypeLabel: 'Open Tab',
        },
      });
    });

    it('should filter out files with unsupported languages', async () => {
      supportedLanguagesService.isLanguageEnabled = jest
        .fn()
        .mockImplementation((lang) => lang === 'typescript');
      duoProjectAccessChecker.checkProjectStatus = jest
        .fn()
        .mockReturnValue({ status: DuoProjectStatus.DuoEnabled, project: undefined });

      const contextResolutions: OpenTabAIContextItem[] = [
        mockEnabledFile,
        mockDisabledFile,
        mockSnippet,
      ];

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext,
        byteSizeLimit: 500000,
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'file://path/to/file1.ts',
        }),
        expect.objectContaining({
          id: 'snippet1',
        }),
      ]);

      expect(supportedLanguagesService.isLanguageEnabled).toHaveBeenCalledWith('typescript');
      expect(supportedLanguagesService.isLanguageEnabled).toHaveBeenCalledWith('ruby');
      expect(supportedLanguagesService.isLanguageEnabled).toHaveBeenCalledTimes(2);
    });

    it('should not check language support for non-file types', async () => {
      const contextResolutions: OpenTabAIContextItem[] = [mockSnippet];

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext,
        byteSizeLimit: 500000,
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'snippet1',
        }),
      ]);
      expect(supportedLanguagesService.isLanguageEnabled).not.toHaveBeenCalled();
    });

    it('should not filter files without a language ID', async () => {
      const contextResolutions: OpenTabAIContextItem[] = [
        createFakePartial<OpenTabAIContextItem>({
          category: 'file',
          id: 'file://path/to/file1.ts',
          content: 'wow',
          metadata: {
            languageId: undefined as unknown as string,
            title: 'file1.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file1 content',
            subTypeLabel: 'Open Tab',
          },
        }),
      ];

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext,
        byteSizeLimit: 500000,
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'file://path/to/file1.ts',
        }),
      ]);
      expect(supportedLanguagesService.isLanguageEnabled).not.toHaveBeenCalled();
    });
  });

  describe('filterContextResolutions', () => {
    it('should apply all filters to the context resolutions', async () => {
      duoProjectAccessChecker.checkProjectStatus = jest
        .fn()
        .mockReturnValue({ status: DuoProjectStatus.DuoEnabled, project: undefined });
      supportedLanguagesService.isLanguageEnabled = jest.fn().mockReturnValue(true);
      const longContent = 'a'.repeat(600000);
      const contextResolutions: OpenTabAIContextItem[] = [
        {
          category: 'file',
          id: 'file://path/to/file1.ts',
          content: 'content1',
          metadata: {
            languageId: 'typescript',
            title: 'file1.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
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
          id: 'file://path/to/file2.ts',
          content: '   ',
          metadata: {
            languageId: 'typescript',
            title: 'file2.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file2 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
        {
          category: 'file',
          id: 'file://path/to/file3.ts',
          content: longContent,
          metadata: {
            languageId: 'typescript',
            title: 'file3.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file3 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
        {
          category: 'file',
          id: 'file://path/to/file4.ts',
          content: 'content4',
          metadata: {
            languageId: 'typescript',
            title: 'file4.ts',
            enabled: true,
            subType: 'open_tab',
            icon: 'file',
            secondaryText: 'file4 content',
            subTypeLabel: 'Open Tab',
            workspaceFolder: {
              name: 'workspace1',
              uri: 'file:///path/to/workspace1',
            },
          },
        },
      ];

      (duoProjectAccessChecker.checkProjectStatus as jest.Mock)
        .mockReturnValueOnce({ status: DuoProjectStatus.DuoEnabled, project: undefined })
        .mockReturnValueOnce({ status: DuoProjectStatus.NonGitlabProject, project: undefined })
        .mockReturnValueOnce({ status: DuoProjectStatus.DuoDisabled, project: undefined })
        .mockReturnValueOnce({ status: DuoProjectStatus.DuoEnabled, project: undefined });

      const result = await filterContextResolutions({
        contextResolutions,
        dependencies,
        documentContext,
        byteSizeLimit: 500000,
      });

      expect(result.length).toBe(2);
      expect(result[1].content?.length).toBe(
        500000 - Buffer.from(`${documentContext.prefix}${documentContext.suffix}content1`).length,
      );
    });
  });
});

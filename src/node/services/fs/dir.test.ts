import { sep } from 'path';
import { fdir as FastDirectoryCrawler } from 'fdir';
import * as fsUtilsModule from '../../../common/services/fs/utils';
import { DesktopDirectoryWalker } from './dir';

jest.mock('fdir');
jest.mock('../../../common/log');
jest.mock('perf_hooks', () => ({
  performance: {
    now: jest.fn(),
  },
}));

const buildExpectedPath = (path: string) => {
  return path.replaceAll('/', sep);
};

describe('DesktopDirectoryWalker', () => {
  let directoryWalker: DesktopDirectoryWalker;

  let fsPathFromUriSpy: jest.SpyInstance;
  let fsPathToUriSpy: jest.SpyInstance;

  const searchedDirectory = {
    filters: {
      fileEndsWith: ['.txt', '.js'],
    },
    directoryUri: fsUtilsModule.fsPathToUri(buildExpectedPath('/path/to/directory')),
  };

  beforeEach(() => {
    directoryWalker = new DesktopDirectoryWalker();
    fsPathFromUriSpy = jest.spyOn(fsUtilsModule, 'fsPathFromUri');
    fsPathToUriSpy = jest.spyOn(fsUtilsModule, 'fsPathToUri');
  });

  const mockFastDirectoryCrawler = (mockPaths: string[]) => {
    jest.mocked(FastDirectoryCrawler as jest.Mock).mockReturnValue({
      withFullPaths: jest.fn().mockReturnThis(),
      filter: jest.fn().mockImplementation((callback) => {
        mockPaths.forEach((path) => callback(path));
        return new FastDirectoryCrawler();
      }),
      crawl: jest.fn().mockReturnThis(),
      withPromise: jest.fn().mockResolvedValue(mockPaths),
    });
  };

  const expectToCrawlDirectory = (path: string) => {
    expect(FastDirectoryCrawler).toHaveBeenCalled();
    const builder = new FastDirectoryCrawler();
    expect(builder.withFullPaths).toHaveBeenCalled();
    expect(builder.filter).toHaveBeenCalled();
    expect(builder.crawl).toHaveBeenCalledWith(path);
    expect(builder.crawl('').withPromise).toHaveBeenCalled();
  };

  describe('findFilesForDirectory', () => {
    it('should return an array of file paths that match the specified criteria', async () => {
      const mockPaths = [
        buildExpectedPath('/path/to/file1.txt'),
        buildExpectedPath('/path/to/file2.js'),
      ];
      const mockUris = expect.arrayContaining([
        expect.objectContaining({ fsPath: mockPaths[0], scheme: 'file' }),
        expect.objectContaining({ fsPath: mockPaths[1], scheme: 'file' }),
      ]);

      mockFastDirectoryCrawler(mockPaths);

      const result = await directoryWalker.findFilesForDirectory(searchedDirectory);

      expectToCrawlDirectory(buildExpectedPath('/path/to/directory'));

      expect(fsUtilsModule.fsPathToUri).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUris);
    });

    it('should return an empty array if no files match the specified criteria', async () => {
      const mockPaths: string[] = [];

      mockFastDirectoryCrawler(mockPaths);

      const result = await directoryWalker.findFilesForDirectory(searchedDirectory);
      const expectedPath = buildExpectedPath('/path/to/directory');

      expectToCrawlDirectory(expectedPath);
      expect(fsPathFromUriSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fsPath: expectedPath,
          scheme: 'file',
        }),
      );
      expect(result).toEqual([]);
    });

    it('should handle windows encoded file URI', async () => {
      const windowsEncodedPath = fsUtilsModule.fsPathToUri(
        'file:///c%3A/Users/jdsla/Development/gitlab/khulnasoft-lsp',
      );
      const mockPath = 'C:\\path\\to\\file.txt';
      const mockPaths = [mockPath];
      mockFastDirectoryCrawler(mockPaths);

      const result = await directoryWalker.findFilesForDirectory({
        directoryUri: windowsEncodedPath,
        filters: {
          // pass in a unix style path
          fileEndsWith: ['/.txt'],
        },
      });

      expect(fsPathFromUriSpy).toHaveBeenCalledWith(windowsEncodedPath);
      expect(fsPathToUriSpy).toHaveBeenCalledWith('C:\\path\\to\\file.txt');
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fsPath: 'c:\\path\\to\\file.txt',
            scheme: 'file',
          }),
        ]),
      );
    });
  });
});

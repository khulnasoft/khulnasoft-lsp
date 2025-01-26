import type { IDocContext } from '../document_transformer_service';
import { getByteSize } from '../utils/byte_size';
import { OpenTabsLruCache } from './lru_cache';

const TEST_BYTE_LIMIT = 1000; // Assuming a 1000 byte limit for testing

function createStringOfByteLength(char: string, byteLength: number): string {
  let result = '';
  while (getByteSize(result) < byteLength) {
    result += char;
  }
  return result.slice(0, -1); // Remove last char as it might have pushed over the limit
}

const SMALL_SIZE = 200;
const LARGE_SIZE = 400;
const EXTRA_SMALL_SIZE = 50;

const smallString = createStringOfByteLength('A', SMALL_SIZE);
const largeString = createStringOfByteLength('C', LARGE_SIZE);
const extraSmallString = createStringOfByteLength('D', EXTRA_SMALL_SIZE);

export function createFakeContext(overrides: Partial<IDocContext> = {}): IDocContext {
  return {
    prefix: '',
    suffix: '',
    fileRelativePath: 'file:///test.ts',
    position: { line: 0, character: 0 },
    uri: 'file:///test.ts',
    languageId: 'typescript',
    workspaceFolder: {
      uri: 'file:///workspace',
      name: 'test-workspace',
    },
    ...overrides,
  };
}

describe('OpenTabsLruCache', () => {
  let lruCache: OpenTabsLruCache;

  beforeEach(() => {
    lruCache = OpenTabsLruCache.getInstance(TEST_BYTE_LIMIT);
  });

  afterEach(() => {
    OpenTabsLruCache.destroyInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance of LruCache', () => {
      const cache1 = OpenTabsLruCache.getInstance(TEST_BYTE_LIMIT);
      const cache2 = OpenTabsLruCache.getInstance(TEST_BYTE_LIMIT);

      expect(cache1).toBe(cache2);
      expect(cache1).toBeInstanceOf(OpenTabsLruCache);
    });
  });

  describe('updateFile', () => {
    it('should add a new file to the cache', () => {
      const context = createFakeContext();

      lruCache.updateFile(context);

      expect(lruCache.openFiles.size).toBe(1);
      expect(lruCache.openFiles.get(context.uri)).toEqual(context);
    });

    it('should update an existing file in the cache', () => {
      const context1 = createFakeContext();
      const context2 = { ...context1, text: 'Updated text' };

      lruCache.updateFile(context1);
      lruCache.updateFile(context2);

      expect(lruCache.openFiles.size).toBe(1);
      expect(lruCache.openFiles.get(context1.uri)).toEqual(context2);
    });
  });

  describe('deleteFile', () => {
    it('should remove a file from the cache', () => {
      const context = createFakeContext();

      lruCache.updateFile(context);
      const isDeleted = lruCache.deleteFile(context.uri);

      expect(lruCache.openFiles.size).toBe(0);
      expect(isDeleted).toBe(true);
    });

    it(`should not remove a file that doesn't exist`, () => {
      const context = createFakeContext();

      lruCache.updateFile(context);
      const isDeleted = lruCache.deleteFile('fake/uri/that/does/not.exist');

      expect(lruCache.openFiles.size).toBe(1);
      expect(isDeleted).toBe(false);
    });

    it('should return correct order of files after deletion', () => {
      const workspaceFolder = { uri: 'file:///workspace', name: 'test-workspace' };
      const context1 = createFakeContext({ uri: 'file:///workspace/file1.ts', workspaceFolder });
      const context2 = createFakeContext({ uri: 'file:///workspace/file2.ts', workspaceFolder });
      const context3 = createFakeContext({ uri: 'file:///workspace/file3.ts', workspaceFolder });

      lruCache.updateFile(context1);
      lruCache.updateFile(context2);
      lruCache.updateFile(context3);

      lruCache.deleteFile(context2.uri);

      expect(lruCache.mostRecentFiles({ context: context1 })).toEqual([context3, context1]);
    });
  });

  describe('mostRecentFiles', () => {
    it('should return ordered files', () => {
      const workspaceFolder = { uri: 'file:///workspace', name: 'test-workspace' };
      const context1 = createFakeContext({ uri: 'file:///workspace/file1.ts', workspaceFolder });
      const context2 = createFakeContext({ uri: 'file:///workspace/file2.ts', workspaceFolder });
      const context3 = createFakeContext({ uri: 'file:///workspace/file3.ts', workspaceFolder });

      lruCache.updateFile(context1);
      lruCache.updateFile(context2);
      lruCache.updateFile(context3);
      lruCache.updateFile(context2);

      const result = lruCache.mostRecentFiles({ context: context2 });

      expect(result).toEqual([context2, context3, context1]);
    });

    it('should return the most recently accessed files in the same workspace', () => {
      const workspaceFolder = { uri: 'file:///workspace', name: 'test-workspace' };
      const otherWorkspaceFolder = { uri: 'file:///other', name: 'other-workspace' };
      const context1 = createFakeContext({ uri: 'file:///workspace/file1.ts', workspaceFolder });
      const context2 = createFakeContext({ uri: 'file:///workspace/file2.ts', workspaceFolder });
      const context3 = createFakeContext({ uri: 'file:///workspace/file3.ts', workspaceFolder });
      const context4 = createFakeContext({
        uri: 'file:///other/file4.ts',
        workspaceFolder: otherWorkspaceFolder,
      });

      lruCache.updateFile(context1);
      lruCache.updateFile(context2);
      lruCache.updateFile(context3);
      lruCache.updateFile(context4);

      const result = lruCache.mostRecentFiles({ context: context2 });
      expect(result.find((file) => file.uri === context4.uri)).toBeUndefined();
    });

    it('should include the current file if includeCurrentFile is true', () => {
      const workspaceFolder = { uri: 'file:///workspace', name: 'test-workspace' };
      const context1 = createFakeContext({ uri: 'file:///workspace/file1.ts', workspaceFolder });
      const context2 = createFakeContext({ uri: 'file:///workspace/file2.ts', workspaceFolder });

      lruCache.updateFile(context1);
      lruCache.updateFile(context2);

      const result = lruCache.mostRecentFiles({ context: context2, includeCurrentFile: true });

      expect(result).toEqual([context2, context1]);
    });

    it('should not include the current file if includeCurrentFile is false', () => {
      const workspaceFolder = { uri: 'file:///workspace', name: 'test-workspace' };
      const context1 = createFakeContext({ uri: 'file:///workspace/file1.ts', workspaceFolder });
      const context2 = createFakeContext({ uri: 'file:///workspace/file2.ts', workspaceFolder });

      lruCache.updateFile(context1);
      lruCache.updateFile(context2);

      const result = lruCache.mostRecentFiles({ context: context2, includeCurrentFile: false });

      expect(result).toEqual([context1]);
    });

    it('should return an empty array if no files match the criteria', () => {
      const context = createFakeContext();

      const result = lruCache.mostRecentFiles({ context });

      expect(result).toEqual([]);
    });
  });

  describe('updateFile with size limit', () => {
    it('should evict least recently used items when limit is reached', () => {
      const context1 = createFakeContext({
        uri: 'file:///workspace/file1.ts',
        prefix: smallString, // 200 bytes
        suffix: smallString, // 200 bytes
      });
      const context2 = createFakeContext({
        uri: 'file:///workspace/file2.ts',
        prefix: smallString, // 200 bytes
        suffix: smallString, // 200 bytes
      });
      const context3 = createFakeContext({
        uri: 'file:///workspace/file3.ts',
        prefix: largeString, // 400 bytes
        suffix: '',
      });
      const context4 = createFakeContext({
        uri: 'file:///workspace/file4.ts',
        prefix: extraSmallString, // 50 bytes
        suffix: extraSmallString, // 50 bytes
      });

      expect(lruCache.updateFile(context1)).toBeTruthy();
      expect(lruCache.updateFile(context2)).toBeTruthy();
      expect(lruCache.updateFile(context3)).toBeTruthy();
      expect(lruCache.updateFile(context4)).toBeTruthy();

      // The least recently used item (context1) should have been evicted
      expect(lruCache.openFiles.size).toBe(3);
      expect(lruCache.openFiles.has(context1.uri)).toBe(false);
      expect(lruCache.openFiles.has(context2.uri)).toBe(true);
      expect(lruCache.openFiles.has(context3.uri)).toBe(true);
      expect(lruCache.openFiles.has(context4.uri)).toBe(true);
    });
  });
});

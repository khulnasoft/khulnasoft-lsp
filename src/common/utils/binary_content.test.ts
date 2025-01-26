import path from 'path';
import { URI } from 'vscode-uri';
import { FsClient } from '../services/fs/fs';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { isBinaryContent, isBinaryFile, BINARY_CHECK_BYTES } from './binary_content';

describe('binary_content', () => {
  describe('isBinaryContent', () => {
    describe('text files', () => {
      it.each([
        ['empty string', ''],
        ['simple text', 'Hello, world!'],
        ['with UTF-8 BOM', '\uFEFFHello'],
        ['with UTF-16 LE BOM', '\uFFFEHello'],
        ['with UTF-16 BE BOM', '\uFEFFHello'],
        ['with newlines and spaces', 'Hello\n  World\t!'],
        ['with unicode', '🦊 says hello'],
      ])('identifies %s as text', (_, content) => {
        expect(isBinaryContent(content)).toBe(false);
      });
    });

    describe('binary files', () => {
      it.each([
        ['PDF header', '%PDF-1.4'],
        ['content with null byte', 'Hello\0World'],
        ['content with control chars', 'Hello\x01World'],
        ['content with multiple control chars', '\x02Hello\x03World'],
      ])('identifies %s as binary', (_, content) => {
        expect(isBinaryContent(content)).toBe(true);
      });
    });

    it('respects binary check size limit', () => {
      const longContent = 'x'.repeat(BINARY_CHECK_BYTES + 100);
      const contentWithNullByteAfterLimit = `${longContent}\0`;

      expect(isBinaryContent(contentWithNullByteAfterLimit)).toBe(false);
    });
  });

  describe('isBinaryFile', () => {
    it('identifies text file correctly', async () => {
      const fsClient = createFakePartial<FsClient>({
        promises: createFakePartial<FsClient['promises']>({
          readFileFirstBytes: jest.fn().mockResolvedValue('Hello, world!'),
        }),
      });

      const result = await isBinaryFile(URI.parse('file:///test.txt'), fsClient);

      expect(result).toBe(false);
      expect(fsClient.promises.readFileFirstBytes).toHaveBeenCalledWith(
        `${path.sep}test.txt`,
        BINARY_CHECK_BYTES,
      );
    });

    it('identifies binary file correctly', async () => {
      const fsClient = createFakePartial<FsClient>({
        promises: createFakePartial<FsClient['promises']>({
          readFileFirstBytes: jest.fn().mockResolvedValue('Hello\0World'),
        }),
      });

      const result = await isBinaryFile(URI.parse('file:///test.bin'), fsClient);

      expect(result).toBe(true);
    });

    it('handles read errors by assuming binary', async () => {
      const fsClient = createFakePartial<FsClient>({
        promises: createFakePartial<FsClient['promises']>({
          readFileFirstBytes: jest.fn().mockRejectedValue(new Error('Read failed')),
        }),
      });

      const result = await isBinaryFile(URI.parse('file:///test.bin'), fsClient);

      expect(result).toBe(true);
    });
  });
});

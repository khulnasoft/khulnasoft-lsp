import { getByteSize, truncateToByteLimit } from './byte_size';

describe('byte_size utilities', () => {
  describe('getByteSize', () => {
    it.each([
      ['empty string', '', 0],
      ['simple ascii', 'hello', 5],
      ['with spaces', 'hello world', 11],
      ['emoji', '🦊', 4],
      ['mixed ascii/emoji content', 'hello 🦊 world', 16],
      ['multi-byte chars', '안녕하세요', 15], // Korean characters
      ['special chars', '∑πμ', 7],
    ])('calculates correct byte size for %s', (_, input, expected) => {
      expect(getByteSize(input)).toBe(expected);
    });
  });

  describe('truncateToByteLimit', () => {
    describe('when input is under byte limit', () => {
      it('returns original string unchanged', () => {
        const input = 'hello world';
        expect(truncateToByteLimit(input, 20)).toBe(input);
      });

      it('handles empty string', () => {
        expect(truncateToByteLimit('', 10)).toBe('');
      });
    });

    describe('when input exceeds byte limit', () => {
      it('handles byte limit of 0', () => {
        expect(truncateToByteLimit('hello', 0)).toBe('');
      });

      it.each([
        ['breaks at word boundary', 'hello world goodbye', 14, 'hello world'],
        ['handles emoji correctly', 'hello 🦊 world', 10, 'hello'],
        [
          'truncates at byte limit when no word boundary found',
          'hello_world_goodbye',
          7,
          'hello_w',
        ],
        ['handles multiple spaces', 'hello   world   goodbye', 12, 'hello'],
      ])('%s', (_, input, byteLimit, expected) => {
        expect(truncateToByteLimit(input, byteLimit)).toBe(expected);
      });

      it('respects custom separator', () => {
        const input = 'hello-world-goodbye';
        expect(truncateToByteLimit(input, 14, /-/g)).toBe('hello-world');
      });

      it('handles case where no separator is found', () => {
        const input = 'helloworld';
        expect(truncateToByteLimit(input, 7)).toBe('hellowo');
      });
    });
  });
});

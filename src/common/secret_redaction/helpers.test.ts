import { convertToJavaScriptRegex } from './helpers';

describe('convertToJavaScriptRegex', () => {
  it('should remove the case-insensitive flag', () => {
    const pcreRegex = 'abc(?i)def(?i)ghi';
    const expected = 'abcdefghi';

    const result = convertToJavaScriptRegex(pcreRegex);

    expect(result).toBe(expected);
  });

  it('should replace \\x60 escape with a backtick', () => {
    const pcreRegex = 'a\\x60b\\x60c';
    const expected = 'a`b`c';

    const result = convertToJavaScriptRegex(pcreRegex);

    expect(result).toBe(expected);
  });

  it('should handle multiple conversions', () => {
    const pcreRegex = 'abc\\x60(?i)def\\x60(?i)ghi\\x60';
    const expected = 'abc`def`ghi`';

    const result = convertToJavaScriptRegex(pcreRegex);

    expect(result).toBe(expected);
  });
});

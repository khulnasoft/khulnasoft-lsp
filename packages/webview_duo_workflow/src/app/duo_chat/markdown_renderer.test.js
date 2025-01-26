import { renderDuoChatMarkdownPreview } from './markdown_renderer';

describe('renderDuoChatMarkdownPreview', () => {
  it('should render markdown to HTML', () => {
    const markdown = '# Hello\n\nThis is **bold** and *italic* text.';
    const expected =
      '<h1 dir="auto">Hello</h1>\n<p dir="auto">This is <strong>bold</strong> and <em>italic</em> text.</p>\n';
    expect(renderDuoChatMarkdownPreview(markdown)).toBe(expected);
  });

  it('should handle empty input', () => {
    expect(renderDuoChatMarkdownPreview('')).toBe('');
  });

  it('should handle null input', () => {
    expect(renderDuoChatMarkdownPreview(null)).toBe('');
  });

  it('should handle undefined input', () => {
    expect(renderDuoChatMarkdownPreview(undefined)).toBe('');
  });

  it('should not render line breaks by default', () => {
    const markdown = 'Line 1\nLine 2';
    const expected = '<p dir="auto">Line 1\nLine 2</p>\n';
    expect(renderDuoChatMarkdownPreview(markdown)).toBe(expected);
  });

  it('should handle bidi text correctly', () => {
    const markdown = 'راست left';
    const expected = '<p dir="auto">راست left</p>\n';
    expect(renderDuoChatMarkdownPreview(markdown)).toBe(expected);
  });

  it('should return original input on parsing error', () => {
    const invalidInput = {
      toString: () => {
        throw new Error('Invalid input');
      },
    };
    expect(renderDuoChatMarkdownPreview(invalidInput)).toBe(invalidInput);
  });

  describe('HTML elements wrapping', () => {
    const complexInput =
      'Multiple elements <h1>Some header</h1>, <button>, <br/>, <button>foo bar</button>';
    const complexOutput =
      '<p dir="auto">Multiple elements <code>&lt;h1&gt;Some header&lt;/h1&gt;</code>, <code>&lt;button&gt;</code>, <code>&lt;br/&gt;</code>, <code>&lt;button&gt;foo bar&lt;/button&gt;</code></p>\n';

    it.each`
      input                                             | expected
      ${'Simple <button> element'}                      | ${'<p dir="auto">Simple <code>&lt;button&gt;</code> element</p>\n'}
      ${'Self-closing <br/> element'}                   | ${'<p dir="auto">Self-closing <code>&lt;br/&gt;</code> element</p>\n'}
      ${'Complete <button>foo</button> element'}        | ${'<p dir="auto">Complete <code>&lt;button&gt;foo&lt;/button&gt;</code> element</p>\n'}
      ${'Multi-words <button>foo bar</button> element'} | ${'<p dir="auto">Multi-words <code>&lt;button&gt;foo bar&lt;/button&gt;</code> element</p>\n'}
      ${'Headers <h1>Some header</h1> check'}           | ${'<p dir="auto">Headers <code>&lt;h1&gt;Some header&lt;/h1&gt;</code> check</p>\n'}
      ${'Block code ```js alert();``` check'}           | ${'<p dir="auto">Block code <code>js alert();</code> check</p>\n'}
      ${complexInput}                                   | ${complexOutput}
    `('should correctly wrap HTML elements with code in "$input"', ({ input, expected }) => {
      expect(renderDuoChatMarkdownPreview(input)).toBe(expected);
    });

    it('does not duplicate the code blocks when those are properly marked in the markdown', () => {
      const input = 'Properly marked `<button>foo bar</button>` element';
      const expected =
        '<p dir="auto">Properly marked <code>&lt;button&gt;foo bar&lt;/button&gt;</code> element</p>\n';
      expect(renderDuoChatMarkdownPreview(input)).toBe(expected);
    });
  });
});

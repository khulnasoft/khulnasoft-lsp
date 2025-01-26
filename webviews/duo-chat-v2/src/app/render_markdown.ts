// eslint-disable-next-line no-restricted-imports
import { marked, Marked } from 'marked';
// Fixme: Could not find a declaration file for module
// @ts-ignore
import markedBidi from 'marked-bidi';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

function addActionButtons() {
  const insertCodeSnippetButton = '<insert-code-snippet></insert-code-snippet>';
  const copyCodeButton = '<copy-code></copy-code>';
  return {
    renderer: {
      code(...args) {
        const html = marked.Renderer.prototype.code.call(this, ...args);
        return `<div class="gl-relative markdown-code-block js-markdown-code">${html}${copyCodeButton}${insertCodeSnippetButton}</div>`;
      },
    },
  };
}

const duoMarked = new Marked(
  {
    async: false,
    breaks: false,
    gfm: false,
  },
  markedBidi(),
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
  addActionButtons(),
);

export default function renderDuoChatMarkdownPreview(md) {
  try {
    return md ? duoMarked.parse(md.toString()) : '';
  } catch {
    return md;
  }
}

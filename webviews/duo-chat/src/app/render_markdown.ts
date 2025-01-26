import { Marked, Renderer } from '@ts-stack/markdown';
import hljs from 'highlight.js';
import DOMPurifyI from 'dompurify';
import 'highlight.js/styles/atom-one-dark.css';

class ActionButtonsRenderer extends Renderer {
  readonly insertCodeSnippetButton = '<insert-code-snippet></insert-code-snippet>';

  readonly copyCodeButton = '<copy-code></copy-code>';

  override code(code: string, infostring?: string, escaped?: boolean): string {
    const html = super.code(code, infostring, escaped);
    return `<div class="gl-relative markdown-code-blockjs-markdown-code">
              ${html}${this.copyCodeButton}${this.insertCodeSnippetButton}
            </div>`;
  }
}

// Set global options for Marked parser
Marked.setOptions({
  highlight: (code: string, lang?: string): string => {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  renderer: new ActionButtonsRenderer(),
});

export function renderDuoChatMarkdownPreview(md: string): string {
  if (!md) {
    return '';
  }

  try {
    const clean = DOMPurifyI.sanitize(md, { USE_PROFILES: { html: true } });
    return Marked.parse(clean.toString());
  } catch (err) {
    console.log('Unable to parse markdown', err);
    return md;
  }
}

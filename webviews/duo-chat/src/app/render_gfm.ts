import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

hljs.configure({
  // we highlight only elements with `js-syntax-highlight` class and
  // this class marks code blocks that are already highlighted by the KhulnaSoft instance
  // If we ever remove the KhulnaSoft post-processing of the LLM response, we can remove this ignore
  ignoreUnescapedHTML: true,
});

function syntaxHighlight(els: HTMLElement[]) {
  if (!els || els.length === 0) return;

  els.forEach((el) => {
    if (el.classList && el.classList.contains('js-syntax-highlight') && !el.dataset.highlighted) {
      hljs.highlightElement(el);

      // This is how the dom elements are designed to be manipulated
      el.dataset.highlighted = 'true';
    }
  });
}

// this is a partial implementation of `renderGFM` concerned only with syntax highlighting.
// for all possible renderers, check
// https://gitlab.com/gitlab-org/gitlab/-/blob/774ecc1f2b15a581e8eab6441de33585c9691c82/app/assets/javascripts/behaviors/markdown/render_gfm.js#L18-40

export function renderGFM(element: HTMLElement) {
  if (!element) {
    return;
  }
  const highlightEls = Array.from(
    element.querySelectorAll('.js-syntax-highlight'),
  ) as HTMLElement[];
  syntaxHighlight(highlightEls);
}

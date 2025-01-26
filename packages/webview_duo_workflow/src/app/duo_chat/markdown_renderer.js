// eslint-disable-next-line no-restricted-imports
import { Marked } from 'marked';
import markedBidi from 'marked-bidi';

const htmlElementsPattern = /(<\w+(?:\s+[^>]*)?\/?>(?:[^>]*<\/\w+>|\s*\/>)?)/gi;

function preprocess(markdown) {
  const transformed = markdown.replace(htmlElementsPattern, '`$1`');
  return transformed;
}

const duoMarked = new Marked();

duoMarked.use(
  { hooks: { preprocess } },
  {
    async: false,
    breaks: false,
    gfm: false,
  },
  markedBidi(),
);

export function renderDuoChatMarkdownPreview(md) {
  try {
    return md ? duoMarked.parse(md.toString()) : '';
  } catch {
    return md;
  }
}

import { parse } from 'node-html-parser';

export const syncLoadScriptsPlugin = {
  name: 'sync-load-scripts-plugin',
  transformIndexHtml(html) {
    const doc = parse(html);
    const body = doc.querySelector('body');
    doc.querySelectorAll('head script').forEach((script) => {
      script.removeAttribute('type');
      script.removeAttribute('crossorigin');
      body.appendChild(script);
    });

    return doc.toString();
  },
};

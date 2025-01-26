import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import * as NodeHtmlParser from 'node-html-parser';
import vue2 from '@vitejs/plugin-vue2';
import { UserConfig } from 'vite';

let svgSpriteContent = '';

const imageToBase64 = (imagePath) => {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
};

export const SyncLoadScriptsPlugin = {
  name: 'sync-load-scripts-plugin',
  transformIndexHtml(html) {
    const doc = NodeHtmlParser.parse(html);
    const body = doc.querySelector('body');
    doc.querySelectorAll('head script').forEach((script) => {
      script.removeAttribute('type');
      script.removeAttribute('crossorigin');

      body?.appendChild(script);
    });

    return doc.toString();
  },
};

export const HtmlTransformPlugin = {
  name: 'html-transform',
  transformIndexHtml(html) {
    return html.replace('{{ svg placeholder }}', svgSpriteContent);
  },
};

export const InlineSvgPlugin = {
  name: 'inline-svg',
  transform(code, id) {
    if (id.endsWith('@khulnasoft/svgs/dist/icons.svg')) {
      svgSpriteContent = fs.readFileSync(id, 'utf-8');
      return 'export default ""';
    }
    if (id.match(/@khulnasoft\/svgs\/dist\/illustrations\/.*\.svg$/)) {
      const base64Data = imageToBase64(id);
      return `export default "data:image/svg+xml;base64,${base64Data}"`;
    }
    return code;
  },
};

export function createViteConfigForWebview(name): UserConfig {
  const outDir = path.resolve(__dirname, `../../../../out/webviews/${name}`);

  return {
    plugins: [vue2(), InlineSvgPlugin, SyncLoadScriptsPlugin, HtmlTransformPlugin],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src/app', import.meta.url)),
      },
    },
    root: './src/app',
    base: '',
    build: {
      target: 'es2022',
      emptyOutDir: true,
      outDir,
      rollupOptions: {
        input: [path.join('src', 'app', 'index.html')],
      },
    },
  };
}

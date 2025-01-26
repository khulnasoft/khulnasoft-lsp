import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import vue2 from '@vitejs/plugin-vue2';
import tailwindcss from 'tailwindcss';
import { syncLoadScriptsPlugin } from './plugins/sync_load_scripts_plugin.mjs';
import { tailwindConfig } from "./default_tailwind_config.mjs";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

let svgSpriteContent = '';

const imageToBase64 = (imagePath) => {
  const imageBuffer = readFileSync(imagePath);
  return imageBuffer.toString('base64');
};

const HtmlTransformPlugin = {
  name: 'html-transform',
  transformIndexHtml(html) {
    return html.replace('{{ svg placeholder }}', svgSpriteContent);
  },
};

const InlineSvgPlugin = {
  name: 'inline-svg',
  transform(code, id) {
    if (id.endsWith('@khulnasoft/svgs/dist/icons.svg')) {
      svgSpriteContent = readFileSync(id, 'utf-8');
      return 'export default ""';
    }
    if (id.match(/@khulnasoft\/svgs\/dist\/illustrations\/.*\.svg$/)) {
      const base64Data = imageToBase64(id);
      return `export default "data:image/svg+xml;base64,${base64Data}"`;
    }
    return code;
  },
};

export function createViteConfigForWebview(name) {
  const outDir = path.resolve(dirname, `../../../out/webviews/${name}`);

  return {
    plugins: [vue2(), InlineSvgPlugin, syncLoadScriptsPlugin, HtmlTransformPlugin],
    resolve: {},
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
    css: {
      postcss: {
        plugins: [
          tailwindcss(tailwindConfig)
        ]
      },
      preprocessorOptions: {
        scss: {
          quietDeps: true, // Suppress all scss warnings that originate from dependencies
        }
      }
    }
  };
};

import { join } from 'path';
import { defineConfig } from 'vite';
import { WEBVIEW_ID } from './src/constants';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [],
  root: './src/app',
  base: '',
  build: {
    target: 'es2022',
    emptyOutDir: true,
    outDir: `../../../../out/webviews/${WEBVIEW_ID}`,
    rollupOptions: {
      input: [join('src', 'app', 'index.html')],
    },
  },
});

import * as esbuild from 'esbuild';
import { wasmEntryPoints, setLanguageServerVersionPlugin, pathImportPlugin } from './helpers';

const config: esbuild.BuildOptions = {
  bundle: true,
  entryPoints: [...wasmEntryPoints(), { in: 'src/browser/main.ts', out: 'browser/main-bundle' }],
  external: ['fs', 'path'],
  loader: { '.wasm': 'copy' },
  logLevel: 'info',
  minify: true,
  outbase: '.',
  outdir: 'out',
  platform: 'browser',
  plugins: [setLanguageServerVersionPlugin, pathImportPlugin],
  sourcemap: true,
  target: 'es2020',
};

async function build() {
  await esbuild.build(config);
}
void build();

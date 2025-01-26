import {
  build,
  fixWebviewPathPlugin,
  setLanguageServerVersionPlugin,
  wasmEntryPoints,
} from './helpers';

void build({
  entryNames: '[dir]/[name]',
  entryPoints: [{ in: 'src/node/main.ts', out: 'node/main-bundle' }, ...wasmEntryPoints()],
  platform: 'node',
  plugins: [fixWebviewPathPlugin, setLanguageServerVersionPlugin],
});

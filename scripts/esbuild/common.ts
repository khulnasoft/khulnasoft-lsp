import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { build, setLanguageServerVersionPlugin } from './helpers';

void build({
  entryNames: '[dir]/[name]',
  entryPoints: [{ in: 'src/common/index.ts', out: 'common/index' }],
  platform: 'node',
  plugins: [
    // This plugin ensures that dependencies from `node_modules` are not bundled
    // in the common folder package, as they will be installed in the client project.
    nodeExternalsPlugin({
      // Include any workspace dependency denoted by the `workspace:` version prefix in the bundle.
      allowWorkspaces: true,
    }),
    setLanguageServerVersionPlugin,
  ],
});

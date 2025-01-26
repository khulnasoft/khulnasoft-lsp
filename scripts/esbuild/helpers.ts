import { readdirSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { Loader, Plugin, BuildOptions } from 'esbuild';
import * as esbuild from 'esbuild';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const nodeModulesRegex = /.*[\\/]node_modules[\\/].*/;

const wasmEntryPoints = () => {
  const files = readdirSync('vendor/grammars').reduce(
    (acc, file) => {
      if (file.endsWith('.wasm')) {
        acc.push({
          in: `vendor/grammars/${file}`,
          out: `vendor/grammars/${file.replace(/\.wasm$/, '')}`,
        });
      }
      return acc;
    },
    [{ in: 'node_modules/web-tree-sitter/tree-sitter.wasm', out: 'node/tree-sitter' }],
  );

  return files;
};

const fixWebviewPathPlugin = {
  name: 'fixWebviewPath',
  setup(build) {
    console.log('[fixWebviewPath] plugin initialized');

    build.onLoad({ filter: /.*[/\\]webview[/\\]constants\.ts/ }, ({ path: filePath }) => {
      console.log('[fixWebviewPath] File load attempt:', filePath);

      if (!filePath.match(/.*[/\\]?node_modules[/\\].*?/)) {
        console.log('[fixWebviewPath] Modifying file:', filePath);

        let contents = readFileSync(filePath, 'utf8');
        contents = contents.replaceAll(
          "WEBVIEW_BASE_PATH = path.join(__dirname, '../../../out/webviews/');",
          "WEBVIEW_BASE_PATH = path.join(__dirname, '../webviews/');",
        );

        return {
          contents,
          loader: extname(filePath).substring(1) as Loader,
        };
      } else {
        console.log('[fixWebviewPath] Skipping file:', filePath);
      }
      return null;
    });
  },
} satisfies Plugin;

const setLanguageServerVersionPlugin = {
  name: 'setLanguageServerVersion',
  setup(build) {
    build.onLoad({ filter: /[/\\]get_language_server_version\.ts$/ }, ({ path: filePath }) => {
      if (!filePath.match(nodeModulesRegex)) {
        let contents = readFileSync(filePath, 'utf8');
        contents = contents.replaceAll(
          '{{KHULNASOFT_LANGUAGE_SERVER_VERSION}}',
          packageJson['version'],
        );
        return {
          contents,
          loader: extname(filePath).substring(1) as Loader,
        };
      }
      return null;
    });
  },
} satisfies Plugin;

const pathImportPlugin = {
  name: 'pathImport',
  setup(pluginBuild: esbuild.PluginBuild) {
    pluginBuild.onResolve({ filter: /^path$/ }, () => {
      // For the browser, resolve to the path-browserify module
      const resolvedPath = require.resolve('path-browserify');
      return {
        path: resolvedPath,
        namespace: 'file',
      };
    });
  },
} satisfies Plugin;

const commonBuildOptions = {
  bundle: true,
  loader: { '.wasm': 'copy' },
  logLevel: 'info',
  minify: true,
  outbase: '.',
  outdir: 'out',
  sourcemap: true,
  target: 'node18.19',
  define: { 'process.env.IS_BUNDLED': '"true"' },
} satisfies BuildOptions;

type BuildOptionsExcludingCommonOptions = Omit<BuildOptions, keyof typeof commonBuildOptions>;

async function build(options: BuildOptionsExcludingCommonOptions) {
  await esbuild.build({
    ...options,
    ...commonBuildOptions,
  });
}

export {
  fixWebviewPathPlugin,
  setLanguageServerVersionPlugin,
  wasmEntryPoints,
  build,
  pathImportPlugin,
};

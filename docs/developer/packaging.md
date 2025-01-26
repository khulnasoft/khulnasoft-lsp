# Packaging

The Language Server project is used in varying desktop and browser environments.
This document describes the different build targets.

To illustrate the build process we first [compile](#compile) our source code, we
then [bundle](#bundle) it for desktop and browser environments which expect
dependencies to be provided for them, and finally we [package](#package) a
standalone desktop executable for environments where NodeJS may not be available.

```mermaid
flowchart LR

subgraph package_scripts[package.json scripts]
  npm_run_compile{{npm run compile}}
  npm_run_package{{npm run package}}
  npm_run_bundle{{npm run bundle}}
  npm_run_bundle_browser{{npm run bundle:browser}}
  npm_run_bundle_desktop{{npm run bundle:desktop}}
end

subgraph build_tools[build tools]
  tsc{{tsc -b}}
  esbuild{{esbuild}}
  pkg{{pkg .}}
end

subgraph src[source code]
  browser_entrypoint_src[src/browser/main.ts]
  desktop_entrypoint_src[src/node/main.ts]
end

subgraph vendor[vendored assets]
  wasm_grammars[vendor/grammars/*.wasm]
end

subgraph tsc_out[tsc output]
  out__browser__main_js(out/browser/main.js)
  out__node__main_js(out/node/main.js)
end

subgraph pkg_out[pkg output]
  bin__gitlab_lsp(bin/khulnasoft-lsp)
end

subgraph esbuild_browser_out[browser bundle]
out__browser__main_bundle_js(out/browser/main-bundle.js)
end

subgraph esbuild_desktop_out[desktop bundle]
  out__node__main_bundle_js(out/node/main-bundle.js)
  out__node__tree_sitter_wasm(out/node/tree-sitter.wasm)
end

%% npm run compile
npm_run_compile --> tsc --> src --> tsc_out

%% npm run bundle
npm_run_bundle --> npm_run_bundle_browser & npm_run_bundle_desktop --> esbuild
esbuild --> desktop_entrypoint_src --> out__node__main_bundle_js
esbuild --> browser_entrypoint_src --> out__browser__main_bundle_js
esbuild ---|--loader=.wasm:copy| vendor

%% npm run package
npm_run_package --> pkg
pkg --> out__node__main_js --> bin__gitlab_lsp
pkg --> out__node__tree_sitter_wasm --> bin__gitlab_lsp
```

## Compile

The `npm run compile` script typechecks TypeScript code and emits types used by downstream consumers.
Project configurations and shared options can be found in `tsconfig.json` and
`tsconfig.shared.json`.

## Bundle

The `npm run bundle` script invokes `bundle:desktop` and `bundle:browser` which invoke `esbuild`
with the appropriate platform and esbuild options.

The language server assumes that `path.join(__dirname, '../../../vendor/grammars/tree-sitter-<LANGUAGE>.wasm')` resolves to a readable path at runtime.

## Package

The `npm run package` script invokes [pkg](https://github.com/vercel/pkg#readme) to build a
standalone executable which doesn't require users to bring their own NodeJS runtime.

## Tree Sitter

We depend on the `web-tree-sitter` module to load `tree-sitter.wasm` and Web
Assembly language grammars.

The [decision](https://gitlab.com/groups/gitlab-org/-/epics/11568#note_1654589370)
was made to use `.wasm` over native extensions to keep consistency between our
different extensions.

We include these as assets in the desktop and browser builds.

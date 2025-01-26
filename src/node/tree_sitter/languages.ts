import { join } from 'node:path';
import { COMMON_TREE_SITTER_LANGUAGES, TreeSitterLanguageInfo } from '../../common/tree_sitter';

const PARENTS =
  process.env.IS_BUNDLED === 'true'
    ? // When bundled, the code is in /out/node/main-bundle.js, while the
      // tree-sitter parsers are under /out/vendor, so we only need to pop off one
      // path segment.
      //
      // Executables created by `pkg` include the wasm grammar blobs via:
      // - an esbuild loader that copies the wasm blobs to `/out/vendor`
      // - a glob pointing to that location in the `pkg.assets` entry in `package.json`.
      //
      // See https://github.com/vercel/pkg/blob/9066ceeb391d9c7ba6aba650109c2fa3f8e088eb/README.md?plain=1#L136-L160.
      ['..']
    : // When *not* bundled (i.e., during unit tests), we need to traverse all the
      // way up to repository root to find the vendor directory.
      ['..', '..', '..'];

export const TREE_SITTER_LANGUAGES = COMMON_TREE_SITTER_LANGUAGES.map((definition) => ({
  ...definition,
  // NOTE: Where the WebAssembly files are relative to the file that contains
  // this `__dirname` reference differs depending on whether the project has
  // been bundled or not. See the comments above for more detail.
  wasmPath: join(__dirname, ...PARENTS, definition.wasmPath),
})) satisfies TreeSitterLanguageInfo[];

# Tree Sitter

To add support for a new language:

1. Install your tree sitter package via `npm install --save-dev <package>`, e.g., `npm install tree-sitter-python@VERSION`.
   1. We install tree sitter languages with `npm`. Ensure secure reproducible binary builds and consistent versioning by specifying a semantic version to use.
   1. **Note**: If your package is not available via NPM, follow the instructions for installing via a Git hash. (#TODO instructions)
1. Update `src/common/tree_sitter/languages.ts` to include the language in `COMMON_TREE_SITTER_LANGUAGES`.
1. Run the wasm build script via `npm run compile:wasm`.
   - This will generate a new `tree-sitter-<language>.wasm` file in `vendor/grammars`.
1. After you've added your Grammar wasm binary, make a few tests for it under `src/tests/unit/tree_sitter/` following the test conventions
1. Confirm `npm run compile` succeeds.
1. Confirm `npm run test:unit` succeeds.
1. Confirm `npm run bundle` succeeds.
1. Confirm `npm run package` succeeds.
1. Open an MR and confirm the integration test job passes.

## Tree Sitter Queries

Using [tree-sitter queries](https://tree-sitter.github.io/tree-sitter/syntax-highlighting#queries), written in a lisp-like syntax, we’re able to extract structured information from a documents syntax tree.

We use tree-sitter queries to capture various AST nodes for different needs. For example, we use queries to capture comments in a file, or to identify function definitions.

For example, to capture comments in a file:

```lisp
  (line_comment)
  (multiline_comment)
] @comment @spell

((multiline_comment) @comment.documentation
  (#lua-match? @comment.documentation "^/[*][*][^*].*[*]/$"))

```

To identify function definitions:

```lisp
(call
  function: [
      (identifier) @name
      (attribute
        object: (identifier) @parent
        attribute: (identifier) @name)
  ]
  arguments: (argument_list) @codeium.parameters) @reference.call

```

Depending on the type of information you want to extract, you'll need to create a new query file or update an existing one.

Depending on the type of information you want to extract, you'll need to create a new query file or update an existing one.

Query files are located in `src/common/parser/(your-resolver)/(resolver)_queries` and are named according to the type of information they extract, for example `comment_queries.ts` for comment queries. Each query file exports an object that maps language names to query strings.

When adding a new query, make sure to:

1. Create a new query file or update an existing one in `src/common/parser/queries`.
1. Test your query thoroughly using the [tree-sitter playground](https://tree-sitter.github.io/tree-sitter/playground).
1. Write unit tests/integration tests to ensure your query works as expected.
1. Update the relevant _resolver_ (e.g. `CommentResolver`) to use your new query.
1. Confirm `npm run compile` succeeds.
1. Confirm `npm run test:unit` succeeds.
1. Open an MR and confirm the integration test job passes.

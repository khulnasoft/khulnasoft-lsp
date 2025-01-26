# Development of @khulnasoft/eslint-plugin

Always `yarn install` before doing things.

## General info

1. This project uses prettier with
   a [lefthook](https://github.com/Arkweid/lefthook) `pre-commit` hook.
2. This project adheres to semantic commits,
   use a tool like [git-cz](https://www.npmjs.com/package/git-cz) to write commit messages
3. There is a script `yarn update` which updates `docs/rules.md` and `lib/index.js`,
   please run it after creating or updating rules.

## Creating rules

Run `yarn createRule`, it will create:

- `docs/rules/<name>.js` (documentation)
- `lib/rules/<name>.js` (rule definition)
- `tests/rules/<name>.js` (rule unit tests)

## Exploring AST

Eslint works with [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) and exposes AST nodes for the rules to use.
To better understrand how the syntax tree looks like for your code example, you can use (AST Explorer tool)[https://astexplorer.net/]

## Testing

Run `yarn test` to execute the test suite, the suite includes rule tests and util tests.
Jest is used as the test runner for executing these tests.

### Rule tests

The [eslint ruletester](https://eslint.org/docs/developer-guide/unit-tests) is used to write tests for eslint rules, new tests should be added for new rules or updates to a rule.

All the current rule tests are available in the `tests/lib/rules` directory.

### Util tests

These utilities are useful to simplify writing new tests and can be found in the `test/lib/utils` directory.

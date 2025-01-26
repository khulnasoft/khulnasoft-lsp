const [, ...restrictedGlobals] = require('eslint-config-airbnb-base/rules/variables').rules[
  'no-restricted-globals'
];

/*
  This plugin contains rules related to KhulnaSoft JavaScript style guide
  Vue specific rules are in lib/configs/vue.js
*/
module.exports = {
  env: {
    browser: true,
    es2020: true,
  },
  extends: ['airbnb-base', 'prettier', 'plugin:promise/recommended'],
  parserOptions: {
    parser: 'espree',
    ecmaVersion: 'latest',
  },
  plugins: ['unicorn', 'promise', 'import', '@khulnasoft'],
  rules: {
    camelcase: [
      'error',
      {
        properties: 'never',
        ignoreDestructuring: true,
      },
    ],
    'default-param-last': 'off',
    'unicorn/filename-case': ['error', { case: 'snakeCase' }],
    'unicorn/no-array-callback-reference': 'error',
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',
    'import/no-deprecated': 'error',
    'import/no-dynamic-require': ['error', { esmodule: true }],
    'no-implicit-coercion': [
      'error',
      {
        boolean: true,
        number: true,
        string: true,
      },
    ],
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['acc', 'accumulator', 'el', 'element', 'state'],
      },
    ],
    'no-restricted-exports': [
      'error',
      {
        restrictedNamedExports: [
          'then', // avoid confusion when used with dynamic `import()` promise
        ],
      },
    ],
    'no-restricted-syntax': 'off',
    'no-sequences': [
      'error',
      {
        allowInParentheses: false,
      },
    ],
    'promise/catch-or-return': [
      'error',
      {
        allowFinally: true,
      },
    ],
    'no-restricted-globals': [
      'error',
      ...restrictedGlobals,
      {
        name: 'escape',
        message:
          "The global `escape` function is unsafe. Did you mean to use `encodeURI`, `encodeURIComponent` or lodash's `escape` instead?",
      },
      {
        name: 'unescape',
        message:
          "The global `unescape` function is unsafe. Did you mean to use `decodeURI`, `decodeURIComponent` or lodash's `unescape` instead?",
      },
    ],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      },
    ],
  },
};

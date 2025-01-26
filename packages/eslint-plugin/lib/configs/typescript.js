const baseConfig = require('./base');

const tsConfig = {
  env: {
    mocha: true,
    jest: true,
  },
  parserOptions: baseConfig.parserOptions,
  extends: [...baseConfig.extends],
  plugins: [...baseConfig.plugins],
  rules: {
    ...baseConfig.rules,
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: ['./tsconfig.json'],
      },
      plugins: ['@typescript-eslint', 'import'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/strict',
        'plugin:import/typescript',
      ],
      reportUnusedDisableDirectives: true,
      rules: {
        semi: [2, 'always'],
        'no-throw-literal': 'off',
        'no-shadow': 'off',
        'no-empty-function': 'off',
        'no-plusplus': 'off',
        'unicorn/no-array-callback-reference': 'off',
        '@typescript-eslint/no-throw-literal': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/return-await': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        'class-methods-use-this': 'off',
        'import/no-cycle': 'error',
        'promise/param-names': 'off',
        'no-use-before-define': ['warn', 'nofunc'],
        'no-restricted-syntax': [
          'error',
          {
            selector: ':matches(PropertyDefinition, MethodDefinition)[accessibility="private"]',
            message: 'Use # prefix instead of `private` to indicate private class members.',
          },
          {
            selector: 'ForInStatement',
            message:
              'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
          },
          {
            selector: 'LabeledStatement',
            message:
              'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
          },
          {
            selector: 'WithStatement',
            message:
              '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
          },
        ],
      },
    },
    {
      files: ['*.test.ts', '*.test.js'],
      rules: {
        'max-classes-per-file': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};

module.exports = tsConfig;

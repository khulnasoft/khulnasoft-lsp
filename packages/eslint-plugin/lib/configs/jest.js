module.exports = {
  extends: ['plugin:jest/recommended'],
  rules: {
    'jest/consistent-test-it': ['error', { fn: 'it', withinDescribe: 'it' }],
    'jest/no-conditional-expect': 'off',
    'jest/valid-title': [
      'error',
      {
        ignoreTypeOfDescribeName: true,
      },
    ],
    'jest/no-restricted-matchers': ['error', {
      toBeFalsy: 'Prefer a stronger matcher like `toBe(false)`',
      toBeTruthy: 'Prefer a stronger matcher like `toBe(true)`'
    }]
  },
};

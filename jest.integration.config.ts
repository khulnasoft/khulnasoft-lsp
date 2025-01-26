import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/int/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '/tmp/'],
  collectCoverage: false,
  testTimeout: 15000,
  maxWorkers: 1,
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
  transformIgnorePatterns: [],
};

export default config;

import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/browser/**/*.test.[jt]s',
    '<rootDir>/src/common/**/*.test.[jt]s',
    '<rootDir>/src/node/**/*.test.[jt]s',
    '<rootDir>/src/tests/unit/**/*.test.[jt]s',
    '<rootDir>/packages/**/*.test.[jt]s',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '/webview_duo_workflow/'],
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
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.[jt]s',
    '<rootDir>/packages/**/src/**/*.[jt]s',
    '!<rootDir>/**/*.test.[jt]s',
    '!<rootDir>/**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageReporters: ['cobertura'],
  coverageDirectory: './reports',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
        outputName: 'unit.xml',
        titleTemplate: '{title}',
        classNameTemplate: '{classname}',
      },
    ],
  ],
};

export default config;

const transformIgnoreNodeModules = [
  '@khulnasoft/ui',
  '@khulnasoft/svgs',
  'bootstrap-vue',
  'vscode-languageserver',
  'graphql-request',
];
const moduleNameMapper = {
  '\\.(svg|gif|png|mp4)(\\?\\w+)?$':
    '<rootDir>/packages/webview_duo_workflow/__mocks__/file_mock.js',
  '\\.css$': '<rootDir>/packages/webview_duo_workflow/__mocks__/file_mock.js',
};

module.exports = {
  displayName: 'webview_duo_workflow',
  rootDir: '../../',
  moduleFileExtensions: ['ts', 'js', 'json', 'vue'],
  moduleNameMapper,
  preset: 'ts-jest',
  testMatch: ['<rootDir>/packages/webview_duo_workflow/src/**/**/*.test.[jt]s'],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.vue$': '@vue/vue2-jest',
  },
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [`node_modules/(?!(${transformIgnoreNodeModules.join('|')}))`],
  setupFilesAfterEnv: ['<rootDir>/packages/webview_duo_workflow/jest.env.js'],
};

const transformIgnoreNodeModules = ['graphql-request'];

module.exports = {
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['<rootDir>/packages/webview_duo_workflow/src/plugin/**/*.test.[jt]s'],
  transformIgnorePatterns: [`node_modules/(?!(${transformIgnoreNodeModules.join('|')}))`],
};

module.exports = () => {
  const glob = `**/*.test.js`;
  const testMatch = [`<rootDir>/${glob}`];

  const transformIgnoreNodeModules = [
    '@khulnasoft/ui',
    '@khulnasoft/svgs',
    '@khulnasoft/duo-ui',
    'bootstrap-vue',
    'vscode-languageserver'
  ];
  const moduleNameMapper = {
    '\\.(svg|gif|png|mp4)(\\?\\w+)?$':
      '<rootDir>/__mocks__/file_mock.js',
    '\\.css$': '<rootDir>/__mocks__/file_mock.js',
  };

  return {
    testMatch,
    moduleFileExtensions: ['js', 'ts', 'vue'],
    preset: 'ts-jest',
    transform: {
      '^.+\\.(ts|tsx)?$': 'ts-jest',
      '^.+\\.(js|jsx)$': 'babel-jest',
      '^.+\\.vue$': '@vue/vue2-jest',
    },
    transformIgnorePatterns: [`node_modules/(?!(${transformIgnoreNodeModules.join('|')}))`],
    testEnvironment: 'jsdom',
    moduleNameMapper,
    setupFilesAfterEnv: ['<rootDir>/jest.env.js'],
  };
};

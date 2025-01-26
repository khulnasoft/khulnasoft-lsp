import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const tailwindDefaultsPath = require.resolve('@khulnasoft/ui/tailwind.defaults.js', { paths: [process.cwd()] });
const tailwindDefaults = require(tailwindDefaultsPath);

export const tailwindConfig = {
  content: ['./src/**/*.{vue,js,html}', './node_modules/@khulnasoft/ui/dist/**/*.{vue,js}', './node_modules/@khulnasoft/duo-ui/dist/**/*.{vue,js}'],
  presets: [tailwindDefaults],
};

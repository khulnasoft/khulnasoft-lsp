import { execaCommand } from 'execa';
import { copyFile, mkdir } from 'node:fs/promises';
import path, { resolve } from 'node:path';
import { cwd } from 'node:process';
import type { TreeSitterLanguageInfo } from '../../src/common/tree_sitter';
import { TREE_SITTER_LANGUAGES } from '../../src/node/tree_sitter/languages';

async function installLanguage(language: TreeSitterLanguageInfo) {
  const grammarsDir = resolve(cwd(), 'vendor', 'grammars');

  try {
    await mkdir(grammarsDir, { recursive: true });
    if (!language.nodeModulesPath) {
      console.warn('nodeModulesPath undefined for grammar!');
      return;
    }
    await execaCommand(
      `npm run tree-sitter -- build --wasm node_modules/${language.nodeModulesPath}`,
    );
    const wasmLanguageFile = path.join(cwd(), `tree-sitter-${language.name}.wasm`);
    console.log(`Installed ${language.name} parser successfully.`);
    await copyFile(wasmLanguageFile, path.join(grammarsDir, `tree-sitter-${language.name}.wasm`));
    await execaCommand(`rm ${wasmLanguageFile}`);
  } catch (error) {
    console.error(`Error installing ${language.name} parser:`, error);
  }
}

async function installLanguages() {
  const installPromises = TREE_SITTER_LANGUAGES.map(installLanguage);
  await Promise.all(installPromises);
}

installLanguages()
  .then(() => {
    console.log('Language parsers installed successfully.');
  })
  .catch((error) => {
    console.error('Error installing language parsers:', error);
  });

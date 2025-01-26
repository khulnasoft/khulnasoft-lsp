import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import compiler from 'vue-template-compiler';

const globs = process.argv.slice(2);

const paths = await globby(globs, { absolute: true });

if (!paths.length) {
  console.log('No files found, please provide globs of paths to scan as arguments:');
  console.log(
    "node scripts/benchmarking/getAllStrings.js '../path/to/gitlab/{ee/,}app/**/*.{js,vue}'",
  );
}

console.log(`Extracting strings from ${paths.length} files.`);
async function checkConstructors(path) {
  const ext = extname(path);
  if (ext !== '.vue' && ext !== '.js') {
    console.warn(`Skipping file with unsupported file type ('${ext}') ${path}`);
    return [];
  }
  let content = await readFile(path, 'utf-8');
  const literals = [];

  const MyVisitor = {
    StringLiteral({ node }) {
      const value = node?.extra?.rawValue ?? node?.value;
      if (value) {
        literals.push(value);
      }
    },
  };

  if (ext === '.vue') {
    const source = compiler.parseComponent(content, { pad: 'line' });

    if (source.template && source.template.content) {
      const compiled = compiler.compile(source.template.content);

      if (compiled.render) {
        const tree = parse(compiled.render, { sourceType: 'script', errorRecovery: true });
        traverse.default(tree, MyVisitor);
      }

      compiled.staticRenderFns.forEach((fn) => {
        const tree = parse(fn, { sourceType: 'script', errorRecovery: true });
        traverse.default(tree, MyVisitor);
      });
    }

    if (source.script && source.script.content) {
      content = source.script.content;
    } else {
      content = '';
    }
  }

  const tree = parse(content, { sourceType: 'module' });
  traverse.default(tree, MyVisitor);

  return literals;
}

const data = (await Promise.all(paths.map(checkConstructors))).flat();

const allStrings = [...new Set(data)].sort();

const target = join(dirname(fileURLToPath(import.meta.url)), './allStrings.json');

console.log(`Found ${allStrings.length} unique strings. Wrote them to ${target}`);

await writeFile(target, JSON.stringify(allStrings), 'utf8');

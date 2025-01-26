import { dirname, join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import functionTimeout from 'function-timeout';

import { isNonLocalizedStringValue } from '../../lib/utils/string-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const allStrings = JSON.parse(await readFile(join(__dirname, 'allStrings.json'), 'utf8'));

const counts = {
  TIMEOUT: 0,
  TRUE: 0,
  FALSE: 0,
};

let resultWriter = null;
if (process.argv.includes('--write-results')) {
  resultWriter = createWriteStream(
    join(__dirname, `result-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`),
  );
}

const testFn = process.argv.includes('--no-timeout')
  ? isNonLocalizedStringValue
  : functionTimeout(isNonLocalizedStringValue, { timeout: 1000 });

for (let i = 0, len = allStrings.length; i < len; i++) {
  if (i % 10000 === 0) {
    console.log(`Checked ${i} strings. Currently at '${allStrings[i]}'`);
  }

  let result;

  try {
    result = testFn(allStrings[i]) ? 'TRUE' : 'FALSE';
  } catch (e) {
    result = 'TIMEOUT';
  }

  counts[result] += 1;

  resultWriter?.write(`${result}|${JSON.stringify(allStrings[i])}\n`);
}
console.log(`Checked ${allStrings.length} strings. Stats:`);

console.log(counts);

resultWriter?.close();

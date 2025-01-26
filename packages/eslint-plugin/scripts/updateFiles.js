#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const getRules = require('./helpers/getRules');
const getConfigs = require('./helpers/getConfigs');

const libPath = path.join(__dirname, '../lib');

const rules = getRules();
const configs = getConfigs();

const createIndexJs = (ruleImports, configImports) => `/**
 * This file is GENERATED, please run \`yarn update\` after adding or renaming a rule
 */
module.exports = {
  rules: {
${ruleImports.join('\n')}
  },
  configs: {
${configImports.join('\n')}
  }
};
`;

const writeIndexJs = () => {
  console.log('Updating lib/index.js...');

  const ruleImports = rules.map((rule) => {
    const relPath = path.relative(libPath, rule.fullPath);
    return `    '${rule.name}': require('./${relPath}'),`;
  });

  const configImports = configs.map((config) => {
    const relPath = path.relative(libPath, config.fullPath);
    return `    '${config.name}': require('./${relPath}'),`;
  });

  fs.writeFileSync(path.join(libPath, 'index.js'), createIndexJs(ruleImports, configImports));

  console.log('Successfully updated lib/index.js');
};

const createDoc = (ruleDocs) => `<!--
 This file is generated, please run \`yarn update\` after adding or renaming a rule
-->

Available rules:

${ruleDocs.join('\n')}
`;

const writeDocIndex = () => {
  console.log('Updating docs/README.md...');

  const ruleImports = rules.map((rule) => {
    const relPath = path.relative(libPath, rule.fullPath).replace('.js', '.md');
    return `- [${rule.name}](./${relPath}): ${rule.docs.description}`;
  });

  fs.writeFileSync(path.join(__dirname, '../docs', 'rules.md'), createDoc(ruleImports));

  console.log('Successfully updated docs/README.md');
};

writeIndexJs();
writeDocIndex();

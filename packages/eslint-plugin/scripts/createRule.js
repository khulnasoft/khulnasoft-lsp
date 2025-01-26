#!/usr/bin/env node
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const baseDir = path.join(__dirname, '..');
const docsDir = path.join(baseDir, 'docs/rules');
const ruleDir = path.join(baseDir, 'lib/rules');
const testDir = path.join(baseDir, 'tests/lib/rules');

const docsTemplate = (name) => `# @khulnasoft/${name}

TODO: Description

## Rule Details

### Examples of **incorrect** code for this rule

TODO

### Examples of **correct** code for this rule

TODO

## Options

Nothing
TODO: or describe here

## Related rules

- TBA

## When Not To Use It

TODO
`;

const ruleTemplate = (name) => `
// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { DOCS_BASE_URL } = require('../constants');

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

// TODO: Add helper methods here

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'TODO: Add description',
      category: 'TODO',
      url: DOCS_BASE_URL + '/${name}.md',
    },
    //Optional:
    schema: [
    ],
  },
  create(context) {},
};
`;

const testTemplate = (name) => `
// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const rule = require('../../../lib/rules/${name}');
const RuleTester = require('eslint').RuleTester;

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const ruleTester = new RuleTester({
  // Maybe parser: require.resolve('vue-eslint-parser'),
  parserOptions: { ecmaVersion: 2015 },
});

ruleTester.run('${name}', rule, {
  valid: [
    {
      code: 'alert(1);',
    },
  ],

  invalid: [
    {
      code: 'alert(2);',
      errors: ['Example error'],
    },
  ],
});
`;

rl.question('How do you want to call your rule?\n', (answer) => {
  const name = answer
    .replace(/^(@khulnasoft\/?)+/, '')
    .replace(/\.js$/, '')
    .toLowerCase()
    .replace(/[^a-z-]/g, '-')
    .replace(/-+/g, '-');

  console.log(`Creating rule: @khulnasoft/${name}`);

  const docsPath = path.join(docsDir, `${name}.md`);

  fs.writeFileSync(docsPath, docsTemplate(name));

  console.log(`Successfully wrote ${docsPath}`);

  const rulePath = path.join(ruleDir, `${name}.js`);

  fs.writeFileSync(rulePath, ruleTemplate(name));

  console.log(`Successfully wrote ${rulePath}`);

  const testPath = path.join(testDir, `${name}.spec.js`);

  fs.writeFileSync(testPath, testTemplate(name));

  console.log(`Successfully wrote ${testPath}`);

  rl.close();
});

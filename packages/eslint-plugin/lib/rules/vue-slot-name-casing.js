'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const utils = require('eslint-plugin-vue/lib/utils');
const casing = require('eslint-plugin-vue/lib/utils/casing');
const { DOCS_BASE_URL } = require('../constants');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce specific casing for slot naming style in template',
      category: undefined,
      url: DOCS_BASE_URL + '/vue-slot-name-casing.md',
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const caseType = 'kebab-case';

    let hasInvalidEOF = false;

    return utils.defineTemplateBodyVisitor(
      context,
      {
        "VElement[name='slot'] > VStartTag > VAttribute[key.name='name']"(node) {
          if (hasInvalidEOF) {
            return;
          }

          const name = node.value.value;
          const casingName = casing.getConverter(caseType)(name);
          if (casingName !== name) {
            context.report({
              node,
              loc: node.loc,
              message: 'Slot name "{{name}}" is not {{caseType}}.',
              data: {
                name,
                caseType,
              },
            });
          }
        },
      },
      Object.assign(
        {
          Program(node) {
            hasInvalidEOF = utils.hasInvalidEOF(node);
          },
        },
        {},
      ),
    );
  },
};

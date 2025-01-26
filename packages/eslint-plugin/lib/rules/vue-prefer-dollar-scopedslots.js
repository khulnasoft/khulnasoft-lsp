// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const { DOCS_BASE_URL } = require('../constants');
const { defineTemplateBodyVisitor } = require('../utils/index');
const utils = require('eslint-plugin-vue/lib/utils');

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

const DOLLAR_SLOTS = '$slots';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Prefer $scopedSlots over $slots for Vue 2.x.',
      category: undefined,
      url: DOCS_BASE_URL + '/vue-prefer-dollar-scopedslots.md',
    },
    messages: {
      preferDollarScopedSlots:
        'Prefer $scopedSlots over $slots for Vue 2.x. Scoped slots are more flexible and powerful, ease migration to Vue 3.x, and also work around https://github.com/vuejs/vue/issues/11084.',
    },
  },
  create(context) {
    const templateVisitor = {
      VExpressionContainer(node) {
        for (const ref of node.references) {
          if (ref.id.name === DOLLAR_SLOTS) {
            context.report({
              node,
              loc: ref.id.loc,
              messageId: 'preferDollarScopedSlots',
            });
          }
        }
      },
    };

    const scriptVisitor = utils.defineVueVisitor(context, {
      MemberExpression(node) {
        if (node.computed) return;

        const { property } = node;
        if (property.name === DOLLAR_SLOTS) {
          context.report({
            node: property,
            loc: property.loc,
            messageId: 'preferDollarScopedSlots',
          });
        }
      },
    });

    return defineTemplateBodyVisitor(context, templateVisitor, scriptVisitor);
  },
};

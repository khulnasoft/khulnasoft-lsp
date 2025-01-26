// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const { DOCS_BASE_URL } = require('../constants');

const { defineTemplateBodyVisitor } = require('../utils/index');

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

/**
 * Get the name of the given attribute node.
 * (Appropriated from the 'no-duplicate-attributes' rule in eslint-plugin-vue)
 *
 * @param {VAttribute | VDirective} attribute The attribute node to get.
 * @returns {string | null} The name of the attribute.
 */
function getName(attribute) {
  if (!attribute.directive) {
    return attribute.key.name;
  }
  if (attribute.key.name.name === 'bind') {
    return (
      (attribute.key.argument &&
        attribute.key.argument.type === 'VIdentifier' &&
        attribute.key.argument.name) ||
      null
    );
  }
  return null;
}

/**
 * Get the the value of the given attribute node if it is not a directive.
 *
 * @param {VAttribute | VDirective} attribute The attribute node to get.
 * @returns {string | null} The value of the attribute.
 */
function getValue(attribute) {
  if (!attribute.directive) {
    return attribute.value.value;
  }
  return null;
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Restrict the use of `data-toggle` bootstrap behaviors within Vue templates',
      category: undefined,
      url: DOCS_BASE_URL + '/vue-no-data-toggle.md',
    },
  },
  create(context) {
    return defineTemplateBodyVisitor(context, {
      VAttribute(node) {
        const name = getName(node);
        if (name == null) {
          return;
        }

        if (name == 'data-toggle') {
          const value = getValue(node);
          let suggestion;

          switch (value) {
            case 'modal':
              suggestion = 'Please use the GlModal component instead.';
              break;
            case 'dropdown':
              suggestion = 'Please use the GlDropdown component instead.';
              break;
            case 'popover':
              suggestion = 'Please use the GlPopover component instead.';
              break;
            case 'tooltip':
              suggestion = 'Please use GlTooltipDirective instead.';
              break;
            default:
              suggestion = 'Please use an equivalent KhulnaSoft UI component instead.';
              break;
          }

          context.report({
            node,
            loc: node.loc,
            message: `The Bootstrap property 'data-toggle' is not allowed inside Vue components. ${suggestion}`,
            data: { value },
          });
        }
      },
    });
  },
};

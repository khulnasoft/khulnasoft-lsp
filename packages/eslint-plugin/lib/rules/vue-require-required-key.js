// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { DOCS_BASE_URL } = require('../constants');

const NATIVE_TYPES = new Set([
  'String',
  'Number',
  'Boolean',
  'Function',
  'Object',
  'Array',
  'Symbol',
]);

const utils = require('eslint-plugin-vue/lib/utils');

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Require the required key to be set',
      url: DOCS_BASE_URL + '/vue-require-required-key.md',
    },
  },
  create(context) {
    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    /**
     * Checks if the passed prop is required
     * @param {Property} prop - Property AST node for a single prop
     * @return {boolean}
     */
    function propHasRequiredKey(prop) {
      const propRequiredNode = prop.value.properties.find(
        (p) => p.type === 'Property' && p.key.name === 'required' && p.value.type === 'Literal',
      );

      return Boolean(propRequiredNode);
    }

    /**
     * Finds all props that don't have a default value set
     * @param {Array} props - Vue component's "props" node
     * @return {Array} Array of props without "default" value
     */
    function findPropsWithoutRequiredKey(props) {
      return props.filter((prop) => {
        if (prop.value.type !== 'ObjectExpression') {
          return (
            (prop.value.type !== 'CallExpression' && prop.value.type !== 'Identifier') ||
            NATIVE_TYPES.has(prop.value.name)
          );
        }

        return !propHasRequiredKey(prop);
      });
    }

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    return utils.executeOnVue(context, (obj) => {
      const props = utils
        .getComponentPropsFromOptions(obj)
        .filter(({ node }) => node.key && node.value && !node.shorthand);

      const propsWithoutRequiredKey = findPropsWithoutRequiredKey(props);
      const propsToReport = propsWithoutRequiredKey;

      for (const prop of propsToReport) {
        const propName =
          prop.propName != null
            ? prop.propName
            : `[${context.getSourceCode().getText(prop.node.key)}]`;

        context.report({
          node: prop.node,
          message: `Prop '{{propName}}' requires required key`,
          data: {
            propName,
          },
        });
      }
    });
  },
};

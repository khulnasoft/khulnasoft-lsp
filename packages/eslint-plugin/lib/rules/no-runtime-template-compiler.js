// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { DOCS_BASE_URL } = require('../constants');
const utils = require('eslint-plugin-vue/lib/utils');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Disallow components which rely on a runtime template compiler.',
      url: DOCS_BASE_URL + '/no-runtime-template-compiler.md',
    },
  },
  create(context) {
    const vues = [];
    const { getDocumentFragment } = context.parserServices;
    const documentFragment = getDocumentFragment ? getDocumentFragment() : null;

    const hasTemplateTag = () =>
      documentFragment
        ? documentFragment.children
            .filter(utils.isVElement)
            .some((element) => element.name === 'template')
        : null;

    return {
      ...utils.executeOnVue(context, (node, type) => {
        if (type === 'definition' && utils.getVueComponentDefinitionType(node) === 'mixin') {
          return;
        }

        const templateOption = utils.findProperty(node, 'template');
        const hasRenderFn = Boolean(utils.findProperty(node, 'render'));

        vues.push({
          node,
          templateOption,
          hasRenderFn,
        });
      }),
      'Program:exit'(node) {
        for (const { node, templateOption, hasRenderFn } of vues) {
          if (templateOption) {
            // Components can define a render function _and_ a template option,
            // in which case the latter is ignored. This is harmless, but
            // confusing, so report these as well, since they're effectively
            // dead code.
            context.report({
              node: templateOption,
              message: `The template component option is not allowed.`,
            });
          } else if (!hasRenderFn && !hasTemplateTag()) {
            // If neither a render function or template tag/option is present,
            // the in-DOM HTML of the mounting DOM element will be extracted as
            // the template, which would require runtime template compilation.
            context.report({
              node,
              message: `Components must not implicitly rely on runtime-compiled templates.`,
            });
          }
        }
      },
    };
  },
};

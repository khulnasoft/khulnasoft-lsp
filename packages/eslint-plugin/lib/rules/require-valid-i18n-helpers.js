// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { DOCS_BASE_URL } = require('../constants');
const { validateI18nHelperCallFactory } = require('../utils/i18n-utils');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Enforces valid usage of translation helpers in JavaScript.',
      category: 'i18n',
      url: DOCS_BASE_URL + '/require-valid-i18n-helpers.md',
    },
  },
  create(context) {
    const validateI18nHelperCall = validateI18nHelperCallFactory(context);

    return {
      CallExpression(node) {
        validateI18nHelperCall(node);
      },
    };
  },
};

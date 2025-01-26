// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { DOCS_BASE_URL } = require('../constants');
const { getFunctionName } = require('../utils/rule-utils');

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

const OFF_LIST = new Set(['$off', 'off']);
const ERROR_MESSAGE = 'Expected off to be called with specific event name and function handler.';

const isUndefined = (node) => node.type === 'Identifier' && node.name === 'undefined';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Throw an error when globally deregistering all event listeners.',
      url: DOCS_BASE_URL + '/no-global-event-off.md',
    },
  },
  create(context) {
    function report(node) {
      context.report({
        node,
        message: ERROR_MESSAGE,
      });
    }

    function isOffCall(node) {
      const functionName = getFunctionName(node);

      return functionName && OFF_LIST.has(functionName);
    }

    function checkFunctionArgumentExists(callExpression) {
      const [, funcArg] = callExpression.arguments;

      if (!funcArg || isUndefined(funcArg)) {
        report(callExpression);
      }
    }

    return {
      CallExpression(node) {
        if (isOffCall(node)) {
          checkFunctionArgumentExists(node);
        }
      },
    };
  },
};

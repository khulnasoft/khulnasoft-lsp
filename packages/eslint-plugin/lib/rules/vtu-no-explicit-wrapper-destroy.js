// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { DOCS_BASE_URL } = require('../constants');
const { NODE_TYPES } = require('../utils/rule-utils');

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

class Rule {
  #vmWrapperNameParts;
  #context;

  constructor(context, options) {
    this.#vmWrapperNameParts = options.wrapperNames || commonVmWrapperNameParts;
    this.#context = context;
  }

  verifyExpression = (expression) => {
    if (
      expression.type === NODE_TYPES.CALL_EXPRESSION &&
      this.#isRedundantDestroyCall(expression)
    ) {
      this.#context.report({
        node: expression,
        messageId: 'redundantDestroy',
      });
    }

    if (
      expression.type === NODE_TYPES.ASSIGNMENT_EXPRESSION &&
      this.#isRedundantNullAssignment(expression)
    ) {
      this.#context.report({
        node: expression,
        messageId: 'redundantNullAssignment',
      });
    }
  };

  #isPotentialVmWrapper = (variableName) =>
    this.#vmWrapperNameParts.some((namePart) =>
      variableName.toLowerCase().includes(namePart.toLowerCase()),
    );

  #isRedundantDestroyCall = (expression) => {
    const calleeName = expression.callee.object?.name;
    const functionCallName = expression.callee.property?.name;
    if (!calleeName || !functionCallName) {
      return false;
    }

    return this.#isPotentialVmWrapper(calleeName) && functionCallName === 'destroy';
  };

  #isRedundantNullAssignment = (expression) => {
    if (
      expression.left.type !== NODE_TYPES.IDENTIFIER ||
      expression.right.type !== NODE_TYPES.LITERAL
    ) {
      return false;
    }

    const identifierName = expression.left.name;
    const assignmentLiteralValue = expression.right.value;

    return this.#isPotentialVmWrapper(identifierName) && assignmentLiteralValue === null;
  };
}

const functionNameRuleTrigger = 'afterEach';
const defaultOptions = {
  ruleTriggerer: functionNameRuleTrigger,
  wrapperNames: ['vm', 'wrapper'],
};

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Prevents redundant destroy calls and null asignment',
      category: 'maintainability',
      url: DOCS_BASE_URL + '/vtu-no-explicit-wrapper-destroy.md',
    },
    messages: {
      redundantDestroy: `Redundant 'destroy()' call in 'after...' block.`,
      redundantNullAssignment: `Redundant null assignment in 'after...' block.`,
    },
    //Optional:
    schema: [
      {
        type: 'object',
        properties: {
          ruleTriggerer: {
            type: 'string',
          },
          wrapperNames: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    return {
      CallExpression(node) {
        const options = { ...defaultOptions, ...(context.options[0] || {}) };

        const name = node.callee.name;
        if (name !== options.ruleTriggerer) {
          return;
        }

        const rule = new Rule(context, options);

        const afterEachFunction = node.arguments[0].body;

        if (afterEachFunction.type === NODE_TYPES.BLOCK_STATEMENT) {
          const statements = afterEachFunction.body;
          for (const statement of statements) {
            if (statement.type !== NODE_TYPES.EXPRESSION_STATEMENT) {
              continue;
            }

            const expression = statement.expression;

            rule.verifyExpression(expression);
          }
        } else {
          rule.verifyExpression(afterEachFunction);
        }
      },
    };
  },
};

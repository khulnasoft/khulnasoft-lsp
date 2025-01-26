// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const utils = require('eslint-plugin-vue/lib/utils');
const { pickBy, identity } = require('lodash');
const { DOCS_BASE_URL } = require('../constants');
const { closest, NODE_TYPES } = require('../utils/rule-utils');

// ------------------------------------------------------------------------------
//   Constants
// ------------------------------------------------------------------------------

const ERROR_ARRAY_IN_TEMPLATE =
  'Expression for binding attribute creates a new Array. Consider moving the Array to a computed.';
const ERROR_OBJECT_IN_TEMPLATE =
  'Expression for binding attribute creates a new Object. Consider moving the Object to a computed.';
const ERROR_NEW_IN_TEMPLATE = `Expression for binding attribute creates a non-primitive value with the new keyword.
  Consider moving the value to a computed.`;

const KEY_ARRAY = 'array';
const KEY_OBJECT = 'object';
const KEY_NEW = 'new';

const DEFAULT_OPTIONS = {
  deny: [KEY_ARRAY, KEY_OBJECT, KEY_NEW],
  allowNames: ['^class$'],
};

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

const isAllowed = (name, allowNames) =>
  allowNames.some((nameRegex) => new RegExp(nameRegex).test(name || ''));

const createVisitor = ({ context, options, errorMessage, key }) => {
  const { deny, allowNames } = options;

  if (!deny.includes(key)) {
    return null;
  }

  return (node) => {
    const attributeNode = closest(node, (x) => x.type === NODE_TYPES.V_ATTRIBUTE);

    const keyNode = attributeNode.key;

    // Only looking for directives
    if (!keyNode || keyNode.type !== NODE_TYPES.V_DIRECTIVE_KEY) {
      return;
    }

    const directiveName = keyNode.name && keyNode.name.name;
    const propName = keyNode.argument && keyNode.argument.name;

    if (directiveName === 'bind' && !isAllowed(propName, allowNames)) {
      context.report({
        node,
        loc: node.loc,
        message: errorMessage,
      });
    }
  };
};

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Prevents non-primitive values from being declared in templates',
      category: 'performance',
      url: DOCS_BASE_URL + '/vue-no-new-non-primitive-in-template.md',
    },
    //Optional:
    errors: {
      ERROR_ARRAY_IN_TEMPLATE,
      ERROR_OBJECT_IN_TEMPLATE,
      ERROR_NEW_IN_TEMPLATE,
    },
    schema: [
      {
        type: 'object',
        properties: {
          deny: {
            type: 'array',
            items: {
              type: 'string',
              enum: [KEY_ARRAY, KEY_NEW, KEY_OBJECT],
            },
            uniqueItems: true,
          },
          allowNames: {
            type: 'array',
            items: {
              type: 'string',
              format: 'regex',
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = Object.assign({}, DEFAULT_OPTIONS, context.options[0] || {});

    const visitor = pickBy(
      {
        'VAttribute VExpressionContainer ArrayExpression': createVisitor({
          context,
          options,
          errorMessage: ERROR_ARRAY_IN_TEMPLATE,
          key: KEY_ARRAY,
        }),
        'VAttribute VExpressionContainer ObjectExpression': createVisitor({
          context,
          options,
          errorMessage: ERROR_OBJECT_IN_TEMPLATE,
          key: KEY_OBJECT,
        }),
        'VAttribute VExpressionContainer NewExpression': createVisitor({
          context,
          options,
          errorMessage: ERROR_NEW_IN_TEMPLATE,
          key: KEY_NEW,
        }),
      },
      identity,
    );

    return utils.defineTemplateBodyVisitor(context, visitor);
  },
};

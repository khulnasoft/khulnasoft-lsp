// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { DOCS_BASE_URL } = require('../constants');

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

const getMemberName = (node) => {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'Literal') {
    return node.value;
  }

  return null;
};

const isMemberName = (node, name) => {
  return getMemberName(node) === name;
};

const isVmReference = (node) => {
  if (node.type === 'MemberExpression') {
    return isMemberName(node.property, 'vm');
  }

  return false;
};

const isAllowableVmProperty = (node, allowable) => {
  const name = getMemberName(node);

  if (!name) {
    return true;
  }

  return allowable.has(name);
};

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 *
 * @param {Set} allowable
 */
const getErrorMessage = (property, allowable) => {
  if (getMemberName(property) === '$nextTick') {
    return `Do not access \`vm\` internals directly. For \`$nextTick\`, import \`nextTick\` directly from the Vue package.`;
  }
  if (allowable.size) {
    const part = Array.from(allowable).join(', ');

    return `Do not access \`vm\` internals directly. Only the following properties are allowed: ${part}`;
  }

  return 'Do not access `vm` internals directly.';
};

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Prevent direct access to `vm` internals for `@vue/test-utils` wrappers.',
      category: undefined,
      url: DOCS_BASE_URL + '/vtu-no-wrapper-vm.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const allowable = new Set(options.allow);

    return {
      AssignmentExpression(node) {
        if (isVmReference(node.right)) {
          context.report({
            node: node.right,
            message:
              'Do not access `vm` internals directly or work around this by saving a reference to `vm`.',
          });
        }
      },
      MemberExpression(node) {
        if (isVmReference(node.object) && !isAllowableVmProperty(node.property, allowable)) {
          context.report({
            node,
            message: getErrorMessage(node.property, allowable),
          });
        }
      },
    };
  },
};

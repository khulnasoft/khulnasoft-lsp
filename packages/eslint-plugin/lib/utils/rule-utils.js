const CALL_EXPRESSION = 'CallExpression';
const ASSIGNMENT_EXPRESSION = 'AssignmentExpression';
const BLOCK_STATEMENT = 'BlockStatement';
const EXPRESSION_STATEMENT = 'ExpressionStatement';
const V_ATTRIBUTE = 'VAttribute';
const V_DIRECTIVE_KEY = 'VDirectiveKey';
const V_EXPRESSION_CONTAINER = 'VExpressionContainer';
const V_LITERAL = 'VLiteral';
const V_TEXT = 'VText';
const V_ELEMENT = 'VElement';
const TEMPLATE_LITERAL = 'TemplateLiteral';
const LITERAL = 'Literal';
const IDENTIFIER = 'Identifier';

const NODE_TYPES = {
  CALL_EXPRESSION,
  BLOCK_STATEMENT,
  ASSIGNMENT_EXPRESSION,
  EXPRESSION_STATEMENT,
  V_ATTRIBUTE,
  V_DIRECTIVE_KEY,
  V_EXPRESSION_CONTAINER,
  V_LITERAL,
  V_TEXT,
  V_ELEMENT,
  TEMPLATE_LITERAL,
  LITERAL,
  IDENTIFIER,
};

function closest(node, predicate) {
  if (!node) {
    return null;
  } else if (predicate(node)) {
    return node;
  }

  return closest(node.parent, predicate);
}

/**
 * Checks whether a node is a string (either a Literal or TemplateLiteral)
 * @param {ASTNode} node The node to type check
 * @returns {boolean} `true` if the node is a string
 */
function isString(node) {
  return [LITERAL, TEMPLATE_LITERAL].includes(node.type);
}

/**
 * Checks whether a node is a template literal.
 *
 * @param {ASTNode} node The node to type check
 * @returns {boolean} `true` if node is a template literal.
 */
function isTemplateLiteral(node) {
  return node.type === TEMPLATE_LITERAL;
}

/**
 * Extracts the string out of a template literal node.
 *
 * @param {ASTNode} node The template literal node
 * @returns {string} The extracted string.
 */
function getTemplateLiteralString(node) {
  return node.quasis
    .filter((quasi) => quasi.type === 'TemplateElement')
    .map((quasi) => quasi.value.raw)
    .join('');
}

/**
 * Check that a node is a `VLiteral type`
 * @param {ASTNode} node The node to type check
 * @returns {boolean} `true` if the node is a VLiteral type
 */
function isVLiteral(node) {
  return node.type === NODE_TYPES.V_LITERAL;
}

/**
 * Select the correct fix function to apply to our node
 * @param {ASTNode} node 'type' property is the node type ['VText','VLiteral...] 'value' the string to be fixed
 * @returns {array} In form [prefix, postfix] with the content to prepend and append to the string
 */
function selectFixFunction({ type, value }) {
  const noQuotes = ['__(', ')'];
  const withQuotes = ['__("', '")'];
  const withExpression = ['{{ __(', ') }}'];
  const withQuotesExpression = ['{{ __("', '") }}'];

  const hasQuotes = isWrappedWithQuotes(value);

  if (type === NODE_TYPES.V_TEXT) {
    return hasQuotes ? withExpression : withQuotesExpression;
  } else {
    return hasQuotes ? noQuotes : withQuotes;
  }
}

/**
 * Check if the string starts and ends with a valid quote symbol
 * @param {string} node The string to check
 * @returns {boolean} True if wrapped in quotes
 */
function isWrappedWithQuotes(str) {
  const len = str.length;
  const quotes = ["'", '"'];
  return quotes.indexOf(str.charAt(0)) > -1 && quotes.indexOf(str.charAt(len - 1)) > -1;
}

/**
 * Removes new line characters and strips trailing spaces
 * @param {string} str The string to clean
 * @returns {string} The cleaned string
 */
function removeNewLines(str = '') {
  if (!str) return '';
  return str.split('\n').join('').trim();
}

/**
 * Replace multiple whitespaces with single whitespace
 * @param {string} str The string to check
 * @returns {string} The string with excessive whitespaces removed
 */
function clearSplitLines(str) {
  return str.replace(/(\s)+/g, ' ');
}

/**
 * Extracts the contents of a TemplateLiteral node
 * @param {ASTNode} node The node to check
 * @returns {string} The extracted text
 */
function extractTemplateLiteralContent(node) {
  const quasis = node.quasis || [];
  return removeNewLines(quasis.map((n) => n.value.raw).join(''));
}

/**
 * Extracts the contents of a TemplateLiteral node
 * @param {ASTNode} node The node to check
 * @returns {string} Text content of the node
 */
function getNodeValue(node) {
  const { type } = node;
  switch (type) {
    case TEMPLATE_LITERAL:
      return extractTemplateLiteralContent(node);
    case V_EXPRESSION_CONTAINER:
      return node.expression.value;
    case LITERAL:
    case V_LITERAL:
    case V_TEXT:
      return node.value;
    default:
      return null;
  }
}

/**
 * Extracts the name of an attribute
 * @param {ASTNode} node The node to check
 * @returns {string} Text content of the node
 */
function getAttributeName(node) {
  const { type } = node;
  switch (type) {
    case V_ATTRIBUTE:
      return node.key.name;
    default:
      return null;
  }
}

/**
 * Gets the name of a function from a call expression
 * @param {ASTNode} node The node to check (call expression)
 * @returns {string} The name of the function
 */
const getFunctionName = (node) => {
  switch (node.callee.type) {
    case 'MemberExpression':
      return node.callee.property.name;
    case 'Identifier':
      return node.callee.name;
    default:
      return '';
  }
};

module.exports = {
  NODE_TYPES,
  clearSplitLines,
  closest,
  isString,
  isTemplateLiteral,
  getTemplateLiteralString,
  isVLiteral,
  removeNewLines,
  selectFixFunction,
  getNodeValue,
  getAttributeName,
  getFunctionName,
};

/**
 * @fileoverview enforce no bare strings in vue templates
 * @author theatlasroom
 */
'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const { DOCS_BASE_URL } = require('../constants');

const { defineTemplateBodyVisitor } = require('../utils/index');
const {
  NODE_TYPES,
  selectFixFunction,
  clearSplitLines,
  removeNewLines,
  getNodeValue,
} = require('../utils/rule-utils');

// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------

/**
 * Check that a node is a `Literal type`
 * @param {ASTNode} node The node to type check
 * @returns {boolean} `true` if the node is a Literal type
 */
function isLiteral(node) {
  if (!node && node.expression && node.parent) return;
  const { expression, parent } = node;
  return (
    !isDirectiveKey(parent) &&
    expression &&
    expression.type &&
    expression.type === NODE_TYPES.LITERAL
  );
  // return !isDirectiveKey(parent) && expression.type === 'Literal'
}

/**
 * Check that a node is a `TemplateLiteral type`
 * @param {ASTNode} node The node to type check
 * @returns {boolean} `true` if the node is a TemplateLiteral type
 */
function isTemplateLiteral(node) {
  const { expression, parent } = node;
  return (
    !isDirectiveKey(parent) &&
    expression &&
    expression.type &&
    expression.type === NODE_TYPES.TEMPLATE_LITERAL
  );
  // return !isDirectiveKey(parent) && expression.type === 'TemplateLiteral'
}

/**
 * Check that a node is a `VDirectiveKey type`
 * @param {ASTNode} node The node to type check
 * @returns {boolean} `true` if the node is a VDirectiveKey type
 */
function isDirectiveKey(node) {
  return node.directive || (node.key && node.key.type === NODE_TYPES.V_DIRECTIVE_KEY);
}

/**
 * Check that a node contains a value
 * @param {ASTNode} node The node to type check
 * @returns {boolean} `true` if the has a value
 */
function hasValue(node) {
  return !!removeNewLines(getNodeValue(node));
}

/**
 * Checks for empty strings
 * @param {string} str The string to check
 * @returns {boolean} True if the string is empty
 */
function isEmptyString(str) {
  return !removeNewLines(str).length > 0;
}

/**
 * Check if a node is a valid function call to our externalization functions
 * @param {ASTNode} node The node to check
 * @returns {boolean} True if it is a call expression in our list of acceptable fucntions
 */
function isValidExternalizationFunction(node) {
  // TODO: should read the available functions from a config with sensible defaults
  const externalizationFunctions = ['__', 's__'];
  return (
    node &&
    node.type === NODE_TYPES.CALL_EXPRESSION &&
    externalizationFunctions.indexOf(node.callee.name) > -1
  );
}

/**
 * Check for special characters
 * @param {string} str The string to check
 * @returns {boolean} True if its a special character
 */
function isSpecial(str) {
  const special = [':', '%', '_', '&', '#', '?', '$', '*', '+', '.', '@', '-', '/', '\\', '|'];
  return special.indexOf(removeNewLines(str)) >= 0;
}

/**
 * Check for html entities
 * @param {string} str The string to check
 * @returns {boolean} True if its a html entity
 */
function isHtmlEntity(str) {
  // TODO: Not working
  return /&[^\s]*;/.test(str);
}

/**
 * Check for strings we should be ignoring
 * @param {string} str The string to check
 * @returns {boolean} True if its ignoreable
 */
function isIgnoredString(str) {
  const cleaned = removeNewLines(str);
  return isEmptyString(cleaned) || isHtmlEntity(cleaned) || isSpecial(cleaned);
}

/**
 * Check for a VElement
 * @param {string} node node string to check
 * @returns {boolean} True if its a VElement
 */
const isVElement = (node) => node.type && node.type === NODE_TYPES.V_ELEMENT;

/**
 * Contains alphanumeric text that can be translated. Ignores single symbols, html entities etc
 * @param {string} str The string to check
 * @returns {boolean} True if it contains english letters or numbers
 */
function hasTranslateableCharacters(str) {
  return /[a-z0-9]/i.test(str);
}

/**
 * Check if the node has siblings
 * @param {ASTNode} node Node to check
 * @returns {boolean} True if parent has > 1 children
 */
function hasSiblings(node) {
  const { parent: p } = node;
  const parent = p.type === NODE_TYPES.V_EXPRESSION_CONTAINER ? p.parent : p;
  return parent && parent.children && parent.children.length > 1;
}

/**
 * Check for strings we should be ignoring
 * @param {Object} context The eslint context object
 * @param {ASTNode} node The node we are reporting on
 */
function report(context, node) {
  const { loc } = node;
  context.report({
    loc: loc,
    message: 'Content should be marked for translation',
    fix: (fixer) => {
      const fixableTypes = [NODE_TYPES.LITERAL, NODE_TYPES.V_TEXT];
      if (fixableTypes.indexOf(node.type) < 0 || hasSiblings(node)) {
        return null;
      }

      const wrapper = selectFixFunction(node);
      const linted = [wrapper[0], clearSplitLines(removeNewLines(node.value)), wrapper[1]];
      return fixer.replaceText(node, linted.join(''));
    },
  });
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'enforce no bare strings in vue `<template>`',
      category: 'i18n',
      url: DOCS_BASE_URL + '/vue-require-i18n-strings.md',
    },
    fixable: 'code',
    schema: [
      {
        enum: ['always', 'never'],
      },
    ],
  },

  create: function (context) {
    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------
    return defineTemplateBodyVisitor(context, {
      VText(node) {
        const value = getNodeValue(node);
        if (
          !node ||
          (!node.loc && !hasValue(node)) ||
          isIgnoredString(value) ||
          isValidExternalizationFunction(node.parent) ||
          !isVElement(node.parent) ||
          !hasTranslateableCharacters(value)
        ) {
          return;
        }
        report(context, node);
      },

      VExpressionContainer(node) {
        if (
          !node ||
          !node.loc ||
          isValidExternalizationFunction(node.expression) ||
          (!isLiteral(node) && !isTemplateLiteral(node)) ||
          !hasTranslateableCharacters(node.value)
        ) {
          return;
        }
        report(context, node.expression);
      },
    });
  },
};

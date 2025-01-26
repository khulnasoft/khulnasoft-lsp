/**
 * @fileoverview enforce no bare attribute strings in vue templates
 * @author theatlasroom
 */
'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const { DOCS_BASE_URL } = require('../constants');

const { defineTemplateBodyVisitor } = require('../utils/index');
const {
  // selectFixFunction,
  clearSplitLines,
  removeNewLines,
  isVLiteral,
  getAttributeName,
} = require('../utils/rule-utils');
// ------------------------------------------------------------------------------
//   Helpers
// ------------------------------------------------------------------------------
const DEFAULT_ATTRIBUTES = [
  'alt',
  'placeholder',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  // NOTE: 'title' is excluded: https://html.spec.whatwg.org/multipage/dom.html#the-title-attribute
];

/**
 * Check for attributes that might contain bare strings that get displayed
 * @param translatableAttributes List of translatable attributes
 * @param attribute Attribute to translate
 * @returns {boolean} True if its translateable
 */
function isTranslatableAttribute(translatableAttributes = [], attribute) {
  return (
    translatableAttributes.length &&
    attribute &&
    translatableAttributes.indexOf(removeNewLines(attribute)) >= 0
  );
}

/**
 * Check for strings we should be ignoring
 * @param {Object} context The eslint context object
 * @param {ASTNode} node The node we are reporting on
 */
function report(context, node) {
  const { loc, value: attributeContent = null } = node;
  context.report({
    loc: loc,
    message: 'Attribute value should be marked for translation',
    fix: (fixer) => {
      if (!attributeContent || !attributeContent.value) {
        return null;
      }

      // externalize the node content
      // const wrapper = selectFixFunction(attributeContent)
      const wrapper = ['"__(`', '`)"'];
      const linted = [
        wrapper[0],
        clearSplitLines(removeNewLines(attributeContent.value)),
        wrapper[1],
      ];
      return [
        // convert the attribute to a binding
        fixer.insertTextBefore(node, ':'),
        // externalize the node content
        fixer.replaceText(attributeContent, linted.join('')),
      ];
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
      description: 'Detect non externalized strings in vue `<template>` attributes',
      category: 'i18n',
      url: DOCS_BASE_URL + '/vue-require-i18n-attribute-strings.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          attributes: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ATTRIBUTES,
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------
    return defineTemplateBodyVisitor(context, {
      VAttribute(node) {
        const { options } = context;

        const translatableAttributes = options.length ? options[0].attributes : DEFAULT_ATTRIBUTES;
        const { directive = false, value = '' } = node;

        const attributeName = getAttributeName(node);
        if (
          directive ||
          !isTranslatableAttribute(translatableAttributes, attributeName) ||
          !isVLiteral(value)
        ) {
          return;
        }
        report(context, node);
      },
    });
  },
};

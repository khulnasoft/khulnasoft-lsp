/**
 * @fileoverview Detect a string which has been hard coded and requires externalization.
 * @author Brandon Labuschagne
 */
'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------
const { isTemplateLiteral, getTemplateLiteralString } = require('../utils/rule-utils');
const { isConstantVariableName, isNonLocalizedStringValue } = require('../utils/string-utils');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const { DOCS_BASE_URL } = require('../constants');

module.exports = {
  meta: {
    docs: {
      description: 'Detect a string which has been hard coded and requires externalization.',
      category: 'i18n',
      recommended: false,
      url: DOCS_BASE_URL + '/require-i18n-strings.md',
    },
    fixable: 'code',
  },

  create: function (context) {
    const message = 'Should not have non i18n strings';

    const localizeMethods = new Set(['__', 'n__', 's__']);

    const htmlProperties = new Set([
      'className',
      'class',
      'style',
      'event',
      'type',
      'font',
      'key',
      'url',
      'borderColor',
      'path',
      'onclick',
      'transition',
      'rootMargin',
      'base64',
      'sprite',
      'href',
      'length',
      'forceFallback',
    ]);

    const objectMethods = new Set([
      'indexOf',
      'includes',
      'lastIndexOf',
      'matches',
      'find',
      'attr',
      'split',
      'exec',
      'one',
    ]);

    const htmlCalls = new Set([
      '$',
      'querySelector',
      'querySelectorAll',
      'createEvent',
      'closest',
      'data',
      'find',
      'hasClass',
      'on',
      'getData',
      'off',
      'bind',
      'removeClass',
      'addClass',
      'registerEventListener',
      'addEventListener',
      'removeEventListener',
    ]);

    const dateMethods = new Set(['dateFormat']);

    function isStringLiteral(node) {
      return node.type === 'Literal';
    }

    function stripVariables(value) {
      return value ? value.replace(/(\%{[\w-]+})/g, '') : '';
    }

    function getCallExpressionString(node, callee) {
      if (callee.name === 'sprintf') {
        return stripVariables(node.value);
      }
      return node.value;
    }

    function isNonLocalizedString(node) {
      if (node.parent.callee) {
        return isNonLocalizedStringValue(getCallExpressionString(node, node.parent.callee));
      }
      if (isTemplateLiteral(node)) {
        return isNonLocalizedStringValue(getTemplateLiteralString(node));
      }
      if (isStringLiteral(node)) {
        return isNonLocalizedStringValue(node.value);
      }
      return false;
    }

    function applyFix(fixer, literal) {
      return [fixer.insertTextBefore(literal, '__('), fixer.insertTextAfter(literal, ')')];
    }

    function reportAndFix(context, node) {
      context.report({
        node,
        message,
        fix(fixer) {
          return applyFix(fixer, node);
        },
      });
    }

    function isTrueConstant(node, declaration) {
      return node.kind === 'const' && isConstantVariableName(declaration.id.name);
    }

    function isKeyList(declaration, expression) {
      return (
        !!declaration.id &&
        expression.type === 'ArrayExpression' &&
        ['key', 'keys'].includes(declaration.id.name)
      );
    }

    function isMemberExpressionIdentifier(expression) {
      if (expression.type !== 'MemberExpression') return false;
      if (!!expression.property.quasis) {
        return /^\w+$/.test(getTemplateLiteralString(expression.property));
      }
      return /^\w+$/.test(expression.property.value);
    }

    function isHtmlProperty(node) {
      if (node.type === 'Identifier') {
        return htmlProperties.has(node.name);
      }
      if (node.type === 'MemberExpression') {
        return htmlProperties.has(node.property.name);
      }
      return false;
    }

    function isLocalizedCall(node) {
      return localizeMethods.has(node.callee.name);
    }

    function isObjectMethod(node) {
      if (!!node.callee.property) {
        return objectMethods.has(node.callee.property.name);
      }
      return false;
    }

    function isHtmlCall(node) {
      if (!!node.callee.property) {
        return htmlCalls.has(node.callee.property.name);
      }
      return htmlCalls.has(node.callee.name);
    }

    function isDateMethod(node) {
      return dateMethods.has(node.callee.name);
    }

    function shouldIgnoreCall(node) {
      return (
        node.callee &&
        (isLocalizedCall(node) || isObjectMethod(node) || isHtmlCall(node) || isDateMethod(node))
      );
    }

    function isNewRegExp(node) {
      return node.callee && node.callee.name === 'RegExp';
    }

    function canSkipLiteral(node) {
      return (
        isNewRegExp(node.parent) ||
        shouldIgnoreCall(node.parent) ||
        (node.parent.left && isHtmlProperty(node.parent.left)) ||
        (node.parent.id && isHtmlProperty(node.parent.id)) ||
        (node.parent.key && isHtmlProperty(node.parent.key)) ||
        isTrueConstant(node.parent.parent, node.parent) ||
        isKeyList(node.parent.parent, node.parent) ||
        isMemberExpressionIdentifier(node.parent)
      );
    }

    function checkReportAndFix(node) {
      if (canSkipLiteral(node)) return;
      if (isNonLocalizedString(node)) {
        reportAndFix(context, node);
      }
    }

    return {
      Literal(node) {
        checkReportAndFix(node);
      },
      TemplateLiteral(node) {
        checkReportAndFix(node);
      },
    };
  },
};

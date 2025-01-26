const {
  getFunctionName,
  isString,
  isTemplateLiteral,
  getTemplateLiteralString,
} = require('../utils/rule-utils');

const GETTEXT = '__';
const P_GETTEXT = 's__';
const N_GETTEXT = 'n__';

const ERROR_MESSAGE_STRING_LITERAL = 'Translation helpers must be called with a string literal.';
const ERROR_MESSAGE_STRING_INTERPOLATION =
  'Translation helpers should not use string interpolation.';
const ERROR_MESSAGE_EXTRANEOUS_NAMESPACE =
  '__ should not be used with a translation namespace, consider using s__ instead.';
const ERROR_MESSAGE_MISSING_NAMESPACE = 's__ requires a translation namespace to be provided.';
const ERROR_MESSAGE_NAMESPACES_MISMATCH =
  'Both strings should use the same namesapce, or no namespace at all, when using n__.';

const NAMESPACE_REGEX = /^\w.+\|/;

const getArgAsString = (arg) =>
  isTemplateLiteral(arg) ? getTemplateLiteralString(arg).trim() : arg.value;

const mustBeCalledWithStringLiteralArguments = (context, node) => {
  const report = (node) => {
    context.report({
      node,
      message: ERROR_MESSAGE_STRING_LITERAL,
    });
  };

  if (!node.arguments.length) {
    report(node);
  }
  const [arg1, arg2] = node.arguments;
  if ([arg1, arg2].some((arg) => arg && !isString(arg))) {
    report(node);
  }
};

const mustNotHaveStringInterpolation = (context, node) => {
  const [arg1, arg2] = node.arguments;
  if ([arg1, arg2].some((arg) => arg?.expressions?.length)) {
    context.report({
      node,
      message: ERROR_MESSAGE_STRING_INTERPOLATION,
    });
  }
};

const mustHaveNamespace = (context, node) => {
  if (node.arguments.length === 2) {
    return;
  }

  const [arg] = node.arguments;
  const value = getArgAsString(arg);
  if (!NAMESPACE_REGEX.test(value)) {
    context.report({
      node,
      message: ERROR_MESSAGE_MISSING_NAMESPACE,
    });
  }
};

const mustNotHaveNamespace = (context, node) => {
  const [arg] = node.arguments;

  // We can ignore cases where no argument is provided as they will
  // be caught by mustBeCalledWithStringLiteralArguments
  if (arg === undefined) {
    return;
  }

  const value = getArgAsString(arg);
  if (NAMESPACE_REGEX.test(value)) {
    context.report({
      node,
      message: ERROR_MESSAGE_EXTRANEOUS_NAMESPACE,
    });
  }
};

const namespacesMustMatch = (context, node) => {
  const [arg1, arg2] = node.arguments;
  const [value1, value2] = [arg1, arg2].map((arg) => getArgAsString(arg));

  // Escape early if either value isn't defined, mustBeCalledWithStringLiteralArguments will
  // handle those.
  if (!value1 || !value2) {
    return;
  }

  const [namespace1, namespace2] = [value1, value2].map((value) => {
    const splitString = value.split('|');
    return splitString.length > 1 ? splitString[0] : '';
  });
  if (namespace1 !== namespace2) {
    context.report({
      node,
      message: ERROR_MESSAGE_NAMESPACES_MISMATCH,
    });
  }
};

const VALIDATORS = {
  [GETTEXT]: [
    mustBeCalledWithStringLiteralArguments,
    mustNotHaveStringInterpolation,
    mustNotHaveNamespace,
  ],
  [P_GETTEXT]: [
    mustBeCalledWithStringLiteralArguments,
    mustNotHaveStringInterpolation,
    mustHaveNamespace,
  ],
  [N_GETTEXT]: [
    mustBeCalledWithStringLiteralArguments,
    mustNotHaveStringInterpolation,
    namespacesMustMatch,
  ],
};

const validateI18nHelperCallFactory = (context) => (node) => {
  const functionName = getFunctionName(node);
  if (!Object.keys(VALIDATORS).includes(functionName)) {
    return;
  }

  VALIDATORS[functionName].forEach((validator) => {
    validator(context, node);
  });
};

module.exports = {
  validateI18nHelperCallFactory,
  ERROR_MESSAGE_STRING_LITERAL,
  ERROR_MESSAGE_STRING_INTERPOLATION,
  ERROR_MESSAGE_EXTRANEOUS_NAMESPACE,
  ERROR_MESSAGE_MISSING_NAMESPACE,
  ERROR_MESSAGE_NAMESPACES_MISMATCH,
};

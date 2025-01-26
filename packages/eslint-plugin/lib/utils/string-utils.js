const cssProperties = new Set(['width', 'height']);
const htmlElements = new Set(['thead', 'tr', 'td', 'th', 'sup', 'sub', 'kbd', 'q', 'samp', 'var']);

function isFileName(value) {
  return /^(\w+\.?)*\.\w{2,}$/.test(value);
}

function isPath(value) {
  return /^([\w-_]*|\.{1,2})[\/\~]+[\w-_\/]*/.test(value);
}

function isUrl(value) {
  return (
    /[a-zA-Z0-9]*(:\/\/)+[a-zA-Z0-9\.]*/.test(value) || /(http){1}[s:\/a-zA-Z0-9.]*/.test(value)
  );
}

function isMailto(str) {
  return (str || '').startsWith('mailto:');
}

function isPlaceholder(value) {
  return /^{?{\w+}}?$/.test(value);
}

function isListOfHtmlElements(value) {
  const splitChar = value.includes(',') ? ', ' : ' ';
  return value.split(splitChar).every((string) => {
    return htmlElements.has(string);
  });
}

function isListOfCssProperties(value) {
  const splitChar = value.includes(',') ? ', ' : ' ';
  return value.split(splitChar).every((string) => {
    return cssProperties.has(string);
  });
}

function isCssSelector(value) {
  return (
    /^,?\s?[\.\#\*\@]\w+.*/.test(value) ||
    /^[a-zA-Z]+[a-zA-Z-]*[\.\#\*]+[a-zA-Z]+[a-zA-Z-]*/.test(value) ||
    /[a-zA-Z][a-zA-Z-]+[a-zA-Z]\.\w/.test(value) ||
    /([a-zA-Z]+[a-zA-Z-]*|\*)\[.*\]/.test(value) ||
    /^[a-zA-Z]+[a-zA-Z-]*[\#\*]$/.test(value) ||
    /^(?:[0-9]+[a-z]|[a-z]+[0-9])[a-z0-9]*\s[a-z0-9][a-z0-9]+-[a-z0-9-]*$/.test(value) ||
    isListOfCssProperties(value) ||
    isListOfHtmlElements(value)
  );
}

function isCssValue(value) {
  return /^\d+(%|rem|em|vh|vw|px)$/.test(value) || /^\(\w+:\s-[a-z0-9-]+\)/.test(value);
}

function isMethodCall(value) {
  return /^\w+\(.*\)$/.test(value);
}

function trimAndSplit(value, separator, trimLeft = true, trimRight = true) {
  const list = value.split(separator);
  if (trimRight && list[list.length - 1] === '') {
    list.pop();
  }
  if (trimLeft && list[0] === '') {
    list.shift();
  }
  return list;
}

function isKebabCase(value) {
  return (
    /^[a-z0-9]+-/.test(value) ||
    /[a-z0-9]+-[a-z0-9-]*$/.test(value) ||
    trimAndSplit(value, /[\s,]+/, false, true).every((item) =>
      /^[a-zA-Z0-9]+-[a-zA-Z0-9-]*$/.test(item),
    )
  );
}

function isScreamingKebabCase(value) {
  return /^([A-Z]+-[A-Z-]*[A-Z]*[\s,]*)+$/.test(value);
}

function containsCamelCase(value) {
  return /[a-z]+[A-Z]{1}/.test(value);
}

function containsSnakeCase(value) {
  return /([a-z]+_[a-z_]*[\s,]*)+/.test(value);
}

function isScreamingSnakeCase(value) {
  return /^([A-Z]+_[A-Z_]+[A-Z][\s,]*)+$/.test(value);
}

function isIndex(value) {
  return /^[\w-]+:[\w-]+$/.test(value);
}

function containsAssignment(value) {
  return value.match(/([a-z]*=['|"])/) || value.match(/(\[[a-z]*=)/);
}

function isSpecial(value) {
  return /^[\:\%\_\&\#\?\[\$].*[^.]/.test(value) || /.*[\*\+]+$/.test(value);
}

function isVariableName(value) {
  return (
    containsCamelCase(value) ||
    containsSnakeCase(value) ||
    isKebabCase(value) ||
    isScreamingKebabCase(value) ||
    isScreamingSnakeCase(value)
  );
}

function isHtml(value) {
  return /<("[^"]*"|'[^']*'|[^'">])*>/.test(value);
}

function isColonSeperated(value) {
  return /(([a-zA-Z])*:)+([a-zA-Z])+/.test(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isNumber(value) {
  return /^\d+$/.test(value);
}

function isLowerCaseWord(value) {
  return /^[a-z0-9]+$/.test(value);
}

function isUpperCaseWord(value) {
  return /^[A-Z]+$/.test(value);
}

function isConstantVariableName(value) {
  return isUpperCaseWord(value) || isScreamingSnakeCase(value);
}

function hasOneWord(value) {
  return /[a-zA-Z]{1,}\s|[a-zA-Z]{2,}/.test(value);
}

function isDateFormat(value) {
  return /^[M|D|Y|m|d|y\s|,]+$/.test(value);
}

function isEmptyVariableAssignment(value) {
  return /\w+=["|']{2}/.test(value);
}

function isKeyboardShortcut(value) {
  return /([a-z0-9]*\+{1})+([a-z0-9]+)/.test(value);
}

function isNonLocalizedStringValue(value) {
  return (
    isNonEmptyString(value) &&
    hasOneWord(value) &&
    !isLowerCaseWord(value) &&
    !isUpperCaseWord(value) &&
    !isNumber(value) &&
    !isPath(value) &&
    !isUrl(value) &&
    !isMailto(value) &&
    !isHtml(value) &&
    !isCssSelector(value) &&
    !isCssValue(value) &&
    !isMethodCall(value) &&
    !isVariableName(value) &&
    !isSpecial(value) &&
    !isFileName(value) &&
    !isPlaceholder(value) &&
    !isIndex(value) &&
    !isDateFormat(value) &&
    !isEmptyVariableAssignment(value) &&
    !isKeyboardShortcut(value) &&
    !isColonSeperated(value) &&
    !containsAssignment(value)
  );
}

module.exports = {
  isNonLocalizedStringValue,
  isConstantVariableName,
};

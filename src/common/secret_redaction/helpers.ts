export const convertToJavaScriptRegex = (pcreRegex: string) => {
  // Remove the (?i) flag (case-insensitive) if present
  const regexWithoutCaseInsensitiveFlag = pcreRegex.replace(/\(\?i\)/g, '');

  // Replace \x60 escape with a backtick
  const jsRegex = regexWithoutCaseInsensitiveFlag.replace(/\\x60/g, '`');

  return jsRegex;
};

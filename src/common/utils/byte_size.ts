export function getByteSize(str: string): number {
  return Buffer.from(str).byteLength;
}

/**
 * Truncates a string to a specified byte limit, attempting to break at word boundaries.
 * If no word boundary is found, truncates at the byte limit.
 *
 * @param str - The string to truncate
 * @param byteLimit - Maximum number of bytes allowed
 * @param separator - RegExp pattern to identify word boundaries (defaults to whitespace)
 * @returns The truncated string
 */
export function truncateToByteLimit(
  str: string,
  byteLimit: number,
  separator: RegExp = /\s+/g,
): string {
  if (getByteSize(str) <= byteLimit) {
    return str;
  }

  let truncated = Buffer.from(str).slice(0, byteLimit).toString();

  const lastSeparatorMatch = [...truncated.matchAll(separator)].pop();
  if (lastSeparatorMatch) {
    truncated = truncated.slice(0, lastSeparatorMatch.index);
  }

  return truncated;
}

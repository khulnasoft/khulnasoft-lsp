export type KhulnaSoftGID = `gid://gitlab/${string}/${string | number}`;
export const GID_NAMESPACE_ISSUE = 'Issue';
export const GID_NAMESPACE_MERGE_REQUEST = 'MergeRequest';

/**
 * Creates a KhulnaSoft global ID / GraphQL ID, from a namespace and standalone ID / REST ID
 */
export function toKhulnaSoftGid(namespace: string, id: string | number): KhulnaSoftGID {
  return `gid://gitlab/${namespace}/${id}` as KhulnaSoftGID;
}

/**
 * Try to parse a KhulnaSoft global ID / GraphQL ID into the ID part / REST ID
 */
export function tryParseKhulnaSoftGid(gid: KhulnaSoftGID | string): number | undefined {
  const result = parseInt(gid.replace(/gid:\/\/gitlab\/.*\//g, ''), 10);
  if (!result || Number.isNaN(result)) {
    return undefined;
  }
  return result;
}

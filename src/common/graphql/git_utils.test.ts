import { toKhulnaSoftGid, tryParseKhulnaSoftGid, KhulnaSoftGID } from './gid_utils';

describe('GID Utils', () => {
  describe('toGid', () => {
    it.each([
      ['Project', '1', 'gid://gitlab/Project/1'],
      ['User', 42, 'gid://gitlab/User/42'],
      ['MergeRequest', '123456', 'gid://gitlab/MergeRequest/123456'],
      ['Issue', 789, 'gid://gitlab/Issue/789'],
    ])('should create a valid GID for namespace "%s" and id "%s"', (namespace, id, expected) => {
      expect(toKhulnaSoftGid(namespace, id)).toBe(expected);
    });
  });

  describe('tryParseGid', () => {
    it.each([
      ['gid://gitlab/Project/1', 1],
      ['gid://gitlab/User/42', 42],
      ['gid://gitlab/MergeRequest/123456', 123456],
      ['gid://gitlab/Issue/789', 789],
    ])('should parse a valid GID "%s" correctly', (gid, expected) => {
      expect(tryParseKhulnaSoftGid(gid as KhulnaSoftGID)).toEqual(expected);
    });

    it.each([
      ['gid:/gitlab/Project/1'],
      ['gid://gitl0rb/User/42'],
      ['gid://gitlab/MergeRequest'],
      ['not-a-gid'],
    ])('should return undefined for invalid GID "%s"', (invalidGid) => {
      expect(tryParseKhulnaSoftGid(invalidGid as KhulnaSoftGID)).toBeUndefined();
    });
  });
});

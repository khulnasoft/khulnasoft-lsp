import { parseKhulnaSoftRemote } from './git_remote_parser';

describe('parse KhulnaSoft remote', () => {
  it.each([
    [
      'git@github.com:fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'ssh://git@github.com:fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'git://git@github.com:fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'http://git@github.com/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'http://gitlab.com/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'https://git@github.com/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'https://gitlab.com/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'git@github.com:group/subgroup/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'group/subgroup', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'http://gitlab.com/group/subgroup/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'group/subgroup', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'https://gitlab.com/fatihacet/gitlab-vscode-extension',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'https://gitlab.com/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'https://gitlab.com:8443/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com:8443', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'https://gitlab.com:8443/fatihacet/gitlab-vscode-extension/',
      { host: 'gitlab.com:8443', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      '[git@github.com:2222]:fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'git@github.com:2222/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com', namespace: '2222/fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
    [
      'ssh://gitlab.com:2222/fatihacet/gitlab-vscode-extension.git',
      { host: 'gitlab.com:2222', namespace: 'fatihacet', projectPath: 'gitlab-vscode-extension' },
    ],
  ])('should parse %s', (remote, parsed) => {
    const { host, namespace, projectPath } = parsed;
    expect(parseKhulnaSoftRemote(remote, 'https://gitlab.com')).toEqual({
      host,
      namespace,
      projectPath,
      namespaceWithPath: `${namespace}/${projectPath}`,
    });
  });

  it.each([
    'git@github.company.com:fatihacet/gitlab-vscode-extension.git',
    'ssh://git@github.company.com:fatihacet/gitlab-vscode-extension.git',
    'git://git@github.company.com:fatihacet/gitlab-vscode-extension.git',
    'http://git@github.company.com/fatihacet/gitlab-vscode-extension.git',
    'http://gitlab.company.com/fatihacet/gitlab-vscode-extension.git',
    'https://git@github.company.com/fatihacet/gitlab-vscode-extension.git',
    'https://gitlab.company.com/fatihacet/gitlab-vscode-extension.git',
    'git@github.company.com:group/subgroup/gitlab-vscode-extension.git',
    'http://gitlab.company.com/group/subgroup/gitlab-vscode-extension.git',
    'https://gitlab.company.com/fatihacet/gitlab-vscode-extension',
    'https://gitlab.company.com/fatihacet/gitlab-vscode-extension.git',
    'https://gitlab.company.com:8443/fatihacet/gitlab-vscode-extension.git',
    'https://gitlab.company.com:8443/fatihacet/gitlab-vscode-extension/',
    '[git@github.company.com:2222]:fatihacet/gitlab-vscode-extension.git',
    'git@github.company.com:2222/fatihacet/gitlab-vscode-extension.git',
    'ssh://gitlab.company.com:2222/fatihacet/gitlab-vscode-extension.git',
  ])(
    'should retun "undefined" when  remote "hostname" does not match user instance URL',
    (remote) => {
      expect(parseKhulnaSoftRemote(remote, 'https://gitlab.com')).toBeUndefined();
    },
  );

  // For more details see https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/11
  it('should support self managed KhulnaSoft on a custom path', () => {
    expect(
      parseKhulnaSoftRemote(
        'https://example.com/gitlab/fatihacet/gitlab-vscode-extension',
        'https://example.com/gitlab',
      ),
    ).toEqual({
      host: 'example.com',
      namespace: 'fatihacet',
      projectPath: 'gitlab-vscode-extension',
      namespaceWithPath: 'fatihacet/gitlab-vscode-extension',
    });
  });
  // For more details see: https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/103
  it('should parse remote URLs without custom path even if the instance has custom path', () => {
    expect(
      parseKhulnaSoftRemote(
        'git@example.com:fatihacet/gitlab-vscode-extension.git',
        'https://example.com/gitlab',
      ),
    ).toEqual({
      host: 'example.com',
      namespace: 'fatihacet',
      projectPath: 'gitlab-vscode-extension',
      namespaceWithPath: 'fatihacet/gitlab-vscode-extension',
    });
  });

  it('fails to parse remote URL without namespace', () => {
    expect(parseKhulnaSoftRemote('git@host:no-namespace-repo.git', '')).toBeUndefined();
  });

  it('fails to parse relative path', () => {
    expect(parseKhulnaSoftRemote('../relative/path', '')).toBeUndefined();
  });
});

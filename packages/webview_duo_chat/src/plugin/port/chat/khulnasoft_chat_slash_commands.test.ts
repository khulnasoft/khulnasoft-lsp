import { defaultSlashCommands } from './gitlab_chat_slash_commands';

describe('KhulnaSoft Chat Slash Commands', () => {
  it('returns pre-defined set of slash commands', () => {
    expect(defaultSlashCommands).toEqual([
      expect.objectContaining({ name: '/reset' }),
      expect.objectContaining({ name: '/clear' }),
      expect.objectContaining({ name: '/tests' }),
      expect.objectContaining({ name: '/refactor' }),
      expect.objectContaining({ name: '/explain' }),
    ]);
  });
});

import { readFileSync } from 'node:fs';
import { spawnSync } from 'child_process';
import { shouldValidateCIAndBundle } from './test_utils';

shouldValidateCIAndBundle('bundle', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  describe('desktop', () => {
    it('should match package.json', () => {
      const expected = packageJson.version;

      const buffer = spawnSync('./out/node/main-bundle.js', ['--version']);

      expect(buffer.stderr.toString()).toContain(`KhulnaSoft Language Server v${expected}`);
    });
  });
});

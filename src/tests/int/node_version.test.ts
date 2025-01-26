import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { shouldValidateCIAndBundle } from './test_utils';

const expectedVSCodeNodeVersion = '18.19.0';
const expectedPkgNodeVersion = '18.5.0';

shouldValidateCIAndBundle('node version', () => {
  test('check that the VS Code and Pkg node versions share the same major version', () => {
    const [vsCodeMajorVersion] = expectedVSCodeNodeVersion.split('.');
    const [pkgMajorVersion] = expectedPkgNodeVersion.split('.');
    expect(vsCodeMajorVersion).toBe(pkgMajorVersion);
  });

  test('check .tool-versions node version', () => {
    const toolVersions = fs.readFileSync('.tool-versions').toString('utf8');
    expect(toolVersions).toContain(`nodejs ${expectedVSCodeNodeVersion}\n`);
  });

  test('check .gitlab-ci.yml node version', () => {
    const codesignImage =
      'registry.gitlab.com/gitlab-org/editor-extensions/build-images/node-codesign';
    const yaml = fs.readFileSync('.gitlab-ci.yml').toString('utf8');
    // in all instances, the (#[^\\n]+\\s+)* matches any line comments before the image: node... string
    expect(yaml).toMatch(
      new RegExp(`default:\\s+(#[^\\n]+\\s+)*image: node:${expectedVSCodeNodeVersion}`, 'm'),
    );
    expect(yaml).toMatch(
      new RegExp(
        `integration-test-pkg-node-(linux|windows):\\s+(#[^\\n]+\\s+)*image: ${codesignImage}:${expectedPkgNodeVersion}`,
        'm',
      ),
    );
    expect(yaml).toMatch(
      new RegExp(
        `publish:\\s+(#[^\\n]+\\s+)*image: ${codesignImage}:${expectedVSCodeNodeVersion}`,
        'm',
      ),
    );
  });

  test('check pkg node version', () => {
    const testFileContents = 'console.log(process.version);';
    const platform = os.platform();
    let pkgPlatform = '';
    switch (platform) {
      case 'darwin':
        pkgPlatform = 'macos';
        break;
      case 'linux':
        pkgPlatform = 'linux';
        break;
      case 'win32':
        pkgPlatform = 'win';
        break;
      default:
        throw new Error(`Unknown platform '${platform}'.`);
    }

    const pkgTestDir = 'pkg_test';
    const pkgTestFile = path.join(pkgTestDir, 'main.js');
    const pkgTestOut = path.join(pkgTestDir, 'pkg-test');
    const pkgCommand = 'npx';
    const pkgCommandArgs = [
      'pkg',
      pkgTestFile,
      '-o',
      pkgTestOut,
      '-t',
      `node18-${pkgPlatform}-${os.arch()}`,
    ];

    if (fs.existsSync(pkgTestDir)) {
      fs.rmSync(pkgTestDir, { recursive: true, force: true });
    }
    fs.mkdirSync(pkgTestDir);
    fs.writeFileSync(pkgTestFile, testFileContents);

    let child = spawnSync(pkgCommand, pkgCommandArgs);
    if (child.status === null || child.status !== 0) {
      throw new Error(
        `pkg failed with exit code ${child.status}: ${child.stdout?.toString(
          'utf8',
        )} ${child.stderr?.toString('utf8')}`,
      );
    }

    child = spawnSync(pkgTestOut);
    if (child.status === null || child.status !== 0) {
      throw new Error(
        `${pkgTestOut} failed with exit code ${child.status}: ${child.stdout?.toString(
          'utf8',
        )} ${child.stderr?.toString('utf8')}`,
      );
    }
    const pkgNodeVersion = child.stdout.toString('utf8').trim();
    expect(pkgNodeVersion).toBe(`v${expectedPkgNodeVersion}`);
  });
});

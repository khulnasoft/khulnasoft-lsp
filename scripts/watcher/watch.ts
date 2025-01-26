import { basename, resolve, resolve as resolvePath } from 'node:path';
import { performance } from 'node:perf_hooks';
import { cwd } from 'node:process';
import { readFile } from 'node:fs/promises';
import { copy, pathExists, readdir } from 'fs-extra';
import { execa } from 'execa';
import { Command } from 'commander';
import { subscribe } from '@parcel/watcher';
import { runScript } from './run_script';
import { log } from './log';

let currentBuildController: AbortController | null = null;

/**
 * Builds the packages and language server.
 * If no packages are specified, it builds all packages.
 * If specified packages are specified, it builds only those packages.
 * If an empty string is specified, it builds only the language server.
 * Filtered packages is a promise that resolves to all packages to build. We still take
 * the original package list to see if there are any packages specified to begin with.
 */
async function runBuild(packages: string[] = [], filteredPackages: Promise<string[][]>) {
  try {
    if (currentBuildController) {
      currentBuildController.abort();
    }
    currentBuildController = new AbortController();

    if (packages?.length && packages.some((pkg) => pkg !== '')) {
      const packageNames = await getPackageNames(filteredPackages);
      log.info(`Building packages:\n${packageNames.join('\n')}`);
      await buildPackages(packageNames, currentBuildController?.signal);
    } else if (packages?.length && packages.some((pkg) => pkg === '')) {
      log.info('Building language server only');
      await runScript(
        'npm run build:language-server-only',
        undefined,
        currentBuildController.signal,
      );
    } else {
      log.info('Building all packages');
      await buildPackages(await getPackageNames(filteredPackages), currentBuildController.signal);
    }

    log.success('Compiled successfully');
    return true;
  } catch (e) {
    if (e instanceof Error && e.name !== 'AbortError') {
      log.error('Script execution failed');
      log.error(e);
    }
    return false;
  }
}

function getPackageName([, name]: unknown[]) {
  return name;
}

async function findPackagesInDir(dirPath: string) {
  const packagesInDir = await readdir(resolve(cwd(), dirPath));
  return Promise.all(
    packagesInDir.map(async (p) => {
      const packagePath = `./${dirPath}/${p}`;
      const packageJsonPath = resolve(cwd(), dirPath, p, 'package.json');
      if (await pathExists(packageJsonPath)) {
        return [packagePath, await readFile(packageJsonPath, 'utf8')];
      }
      return [];
    }),
  ).then((results) => results.filter(([, json]) => Boolean(json)));
}

async function getPackages(packages: string[]): Promise<string[][]> {
  const packageEntries = await Promise.all([
    findPackagesInDir('packages'),
    findPackagesInDir('webviews'),
  ]).then((results) => results.flat());

  const allPackageEntries = packageEntries.map(([dir, p]) => [dir, JSON.parse(p as string).name]);

  log.info(`All package names: ${allPackageEntries.map(getPackageName).join(', ')}`);

  if (packages.includes('*')) {
    return allPackageEntries;
  }

  const filteredPackages = allPackageEntries.filter(([dir, name]) => {
    const [scope, packageName] = name.split('/');
    const dirName = dir.split('/').at(-1);
    return packages.some(
      (pkg) =>
        pkg === packageName || pkg === `${scope}/${packageName}` || pkg === dirName || pkg === dir,
    );
  });

  log.info(`Filtered package names: ${filteredPackages.map(getPackageName).join(', ')}`);

  return filteredPackages;
}

/**
 * Helper function for workspace packages.
 */
async function getPackageNames(packages: Promise<string[][]>): Promise<string[]> {
  return packages.then((pkgs) => pkgs.map(getPackageName) as unknown as Promise<string[]>);
}

async function buildPackages(packageNames: string[], signal: AbortSignal): Promise<void> {
  const buildPromises = packageNames.map((p) =>
    runScript(`npm run build:package -- ${p}`, undefined, signal),
  );
  // Always build the language server
  buildPromises.push(runScript('npm run build:language-server-only', undefined, signal));
  await Promise.all(buildPromises);
}

const ASSETS_DIR = 'dist-desktop/assets/language-server';
const NODE_MODULES_DIR = 'node_modules/@khulnasoft/khulnasoft-lsp';
/**
 * Publish to npm pack and copy files to vscode extension.
 */
async function postBuildVSCodeCopyFiles(vsCodePath: string, signal: AbortSignal) {
  await Promise.all([copyToDistDesktop(vsCodePath, signal), copyToNodeModules(vsCodePath, signal)]);
}

/**
 * Copy the files to the dist-desktop directory of the vscode extension.
 * This is used so that we do not need to rebuild the vscode extension to test changes to the language server.
 */
const copyToDistDesktop = async (vsCodePath: string, signal: AbortSignal) => {
  try {
    if (signal.aborted) {
      throw new Error('AbortError');
    }
    const desktopAssetsDir = resolve(vsCodePath, ASSETS_DIR);
    const outDir = resolve(cwd(), 'out');
    await copy(outDir, desktopAssetsDir, { overwrite: true, errorOnExist: false });
    log.success(`Copied /${basename(outDir)} to ${basename(vsCodePath)}/${ASSETS_DIR}`);
  } catch (error) {
    if (error instanceof Error && error.message === 'AbortError') {
      log.warn('Copy to dist-desktop was aborted');
    } else {
      log.error('Whoops, something went wrong...');
      log.error(error);
    }
  }
};

/**
 * Copy the files to the node_modules directory of the vscode extension.
 * This mimics the behavior of installing the package from npm.
 */
const copyToNodeModules = async (vsCodePath: string, signal: AbortSignal) => {
  const commandCwd = resolvePath(cwd());
  const nodeModulesDir = resolve(vsCodePath, NODE_MODULES_DIR);
  try {
    if (signal.aborted) {
      throw new Error('AbortError');
    }
    log.info('running npm pack --dry-run --json');
    const { stdout } = await execa('npm', ['pack', '--dry-run', '--json'], { cwd: commandCwd });
    const validatedJSON = stdout.match(/\[[\s\S]*\{[\s\S]*\}[\s\S]*\]/);
    if (!validatedJSON) {
      throw new Error('Invalid JSON structure: could not match expected npm pack output');
    }

    const packOutput = JSON.parse(validatedJSON[0]);
    const filePaths = packOutput
      ? packOutput[0].files.map((file: { path: string }) => file.path)
      : [];

    await Promise.all(
      filePaths.map(async (filePath: string) => {
        if (signal.aborted) {
          throw new Error('AbortError');
        }
        const sourcePath = resolvePath(commandCwd, filePath);
        const destPathNodeModules = resolvePath(nodeModulesDir, filePath);
        await copy(sourcePath, destPathNodeModules, { overwrite: true, errorOnExist: false });
      }),
    );

    log.success(
      `Copied ${filePaths.length} files to ${basename(vsCodePath)}/node_modules/@khulnasoft/khulnasoft-lsp`,
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'AbortError') {
      log.warn('Copy to node_modules was aborted');
    } else {
      log.error('Whoops, something went wrong...');
      log.error(error);
    }
  }
};

function postBuild(options: { editor?: string; vscodePath: string }, signal: AbortSignal) {
  if (options.editor === 'vscode') {
    const vsCodePath = options.vscodePath ?? '../gitlab-vscode-extension';
    return [postBuildVSCodeCopyFiles(vsCodePath, signal)];
  }
  log.warn('No editor specified, skipping post-build steps');
  return [Promise.resolve()];
}

async function run(
  options: { editor?: string; vscodePath: string; packages?: string[] },
  filteredPackages: Promise<string[][]>,
) {
  const now = performance.now();
  const buildSuccessful = await runBuild(options.packages, filteredPackages);
  if (!buildSuccessful) return buildSuccessful;

  if (currentBuildController) {
    log.info('Running post-build steps');
    await Promise.all(postBuild(options, currentBuildController.signal));
  }

  log.success(`Finished in ${Math.round(performance.now() - now)}ms`);
  return true;
}

async function startWatcher(options: { editor?: string; vscodePath: string; packages?: string[] }) {
  const srcDir = './src';
  const scriptsDir = './scripts';
  const packagesDir = './packages';
  const webviewsDir = './webviews';
  const filteredPackages = getPackages(options.packages ?? []);
  const dirs = [srcDir, scriptsDir, packagesDir, webviewsDir];
  let timeout: NodeJS.Timeout | null = null;
  const watchMsg = () => log.info(`Watching for file changes on ${dirs.join(', ')}`);

  // Initial build
  await run(options, filteredPackages);

  await Promise.all(
    dirs.map(async (d) => {
      await subscribe(
        d,
        async (err, events) => {
          if (err) {
            log.error(err);
            return;
          }

          for (const event of events) {
            const { type, path } = event;

            switch (type) {
              case 'create':
                log.info(`File ${path} has been added`);
                break;
              case 'update':
                log.info(`File ${path} has been changed`);
                break;
              case 'delete':
                log.info(`File ${path} has been removed`);
                break;
              default:
                log.info(`File ${path} has been ${type}`);
                break;
            }
          }

          // Debounce rebuilds
          if (timeout) clearTimeout(timeout);
          if (currentBuildController) currentBuildController.abort();

          timeout = setTimeout(async () => {
            await run(options, filteredPackages);
            watchMsg();
          }, 200);
        },
        {
          ignore: ['.*', '**/vite.config.ts.timestamp-*.mjs', '**/node_modules/**'],
        },
      );
    }),
  );
  watchMsg();
}

async function main() {
  const program = createProgram();
  program.parse();

  const options = program.opts();
  await startWatcher(options as { editor?: string; vscodePath: string });
}

main().catch((error) => {
  log.error('An error occurred:');
  log.error(error);
  process.exit(1);
});

function createProgram() {
  const program = new Command();
  program
    .name('watch')
    .description('Watch for file changes and run build')
    .option('-e, --editor <type>', 'Specify editor type (e.g., vscode)')
    .option('-vp, --vscode-path <path>', 'Path to VSCode extension', '../gitlab-vscode-extension')
    .option('-p, --packages <packages...>', 'Specify packages to watch');

  return program;
}

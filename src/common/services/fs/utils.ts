// NOTE: we are replacing 'path' with 'path-browserify' for the browser environment
// see scripts/esbuild/browser.ts for more detail
import { posix, relative } from 'path';
import { URI } from 'vscode-uri';

export const fsPathToUri = (fsPath: string): URI => {
  return URI.file(fsPath);
};

export const fsPathFromUri = (fsUri: URI): string => {
  return fsUri.fsPath;
};

export const parseURIString = (uri: string): URI => {
  return URI.parse(uri);
};

// Dynamically determine platform
// TODO: make this more robust and move to OS utilities folder
const getPlatform = () => {
  return process?.platform ?? 'browser';
};

export function splitPath(path: string): string[] {
  const decodedPath = decodeURIComponent(path);
  return decodedPath.split(/[/\\]+/).filter(Boolean);
}

// ---- DO NOT MODIFY BELOW UNLESS NEEDED ---- //
// This code has been adapted from vscode's public codebase
// https://github.com/microsoft/vscode/blob/f3fba4ec23f548876e33a4f4eb32eab6cc37ac96/src/vs/base/common/resources.ts#L235
// Because the vscode-uri package does not provide a function to get the relative path
// we adopted this code from vscode who consumes the same package.

/**
 * Takes a Windows OS path and changes backward slashes to forward slashes.
 * This should only be done for OS paths from Windows (or user provided paths potentially from Windows).
 * Using it on a Linux or MaxOS path might change it.
 */
function toSlashes(osPath: string) {
  return osPath.replace(/[\\/]/g, '/');
}

function ignorePathCasing(uri: URI, isLinux: boolean): boolean {
  // A file scheme resource is in the same platform as code, so ignore case for non-linux platforms
  // Resource can be from another platform. Lowering the case as a hack. Should come from File system provider
  return uri.scheme === 'file' ? !isLinux : true;
}

export function getRelativePath(from: URI, to: URI): string {
  const processPlatform = getPlatform();

  if (from.scheme === 'file') {
    const relativePath = relative(from.fsPath, to.fsPath);
    return processPlatform === 'win32' ? toSlashes(relativePath) : relativePath;
  }

  let fromPath = from.path || '/';
  const toPath = to.path || '/';

  if (ignorePathCasing(from, processPlatform === 'linux')) {
    // make casing of fromPath match toPath
    let i = 0;
    for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
      if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
        if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
          break;
        }
      }
    }
    fromPath = toPath.substr(0, i) + fromPath.substr(i);
  }

  return posix.relative(fromPath, toPath);
}

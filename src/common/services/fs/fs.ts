import type { promises, PathLike } from 'node:fs';
import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { PromiseFsClient } from 'isomorphic-git';

export interface ExtendedPromiseFsClient extends PromiseFsClient {
  promises: PromiseFsClient['promises'] & {
    readFile: typeof promises.readFile;
    writeFile: typeof promises.writeFile;
    unlink: typeof promises.unlink;
    readdir: typeof promises.readdir;
    mkdir: typeof promises.mkdir;
    rmdir: typeof promises.rmdir;
    stat: typeof promises.stat;
    lstat: typeof promises.lstat;
    readlink?: typeof promises.readlink;
    symlink?: typeof promises.symlink;
    chmod?: typeof promises.chmod;
    readFileFirstBytes: (path: PathLike, length: number) => Promise<string>;
  };
}

export interface FsClient extends ExtendedPromiseFsClient {}

export const FsClient = createInterfaceId<FsClient>('FsClient');

const notImplemented = async () => {
  throw new Error('Not implemented');
};

@Injectable(FsClient, [])
export class EmptyFsClient implements FsClient {
  promises: ExtendedPromiseFsClient['promises'] = {
    readFile: notImplemented,
    writeFile: notImplemented,
    unlink: notImplemented,
    readdir: notImplemented,
    mkdir: notImplemented,
    rmdir: notImplemented,
    stat: notImplemented,
    lstat: notImplemented,
    readFileFirstBytes: notImplemented,
  };
}

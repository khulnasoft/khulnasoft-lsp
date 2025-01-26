import * as fs from 'fs';
import type { PathLike } from 'node:fs';
import { Injectable } from '@khulnasoft/di';
import { EmptyFsClient, FsClient } from '../../../common/services/fs/fs';

@Injectable(FsClient, [])
export class DesktopFsClient extends EmptyFsClient {
  promises = {
    readFile: fs.promises.readFile.bind(fs),
    writeFile: fs.promises.writeFile.bind(fs),
    unlink: fs.promises.unlink.bind(fs),
    readdir: fs.promises.readdir.bind(fs),
    mkdir: fs.promises.mkdir.bind(fs),
    rmdir: fs.promises.rmdir.bind(fs),
    stat: fs.promises.stat.bind(fs),
    lstat: fs.promises.lstat.bind(fs),
    chmod: fs.promises.chmod.bind(fs),
    readlink: fs.promises.readlink.bind(fs),
    symlink: fs.promises.symlink.bind(fs),
    readFileFirstBytes: this.#readFileFirstBytes,
  };

  async #readFileFirstBytes(filePath: PathLike, bytes: number): Promise<string> {
    const buffer = Buffer.alloc(bytes);
    const fileHandle = await fs.promises.open(filePath, 'r');
    try {
      const { bytesRead } = await fileHandle.read(buffer, 0, bytes);
      return buffer.slice(0, bytesRead).toString('utf8');
    } finally {
      await fileHandle.close();
    }
  }
}

import { createFakePartial } from '../../test_utils/create_fake_partial';
import { FsClient } from './fs';

export class MockFsClient implements FsClient {
  promises: FsClient['promises'] = {
    readFile: jest.fn().mockResolvedValue(Buffer.from('')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    mkdir: jest.fn().mockResolvedValue(undefined),
    rmdir: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
    lstat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
    chmod: jest.fn().mockResolvedValue(undefined),
    readlink: jest.fn().mockResolvedValue(''),
    symlink: jest.fn().mockResolvedValue(undefined),
    readFileFirstBytes: jest.fn().mockResolvedValue(undefined),
  };
}

export const createMockFsClient = () => createFakePartial<FsClient>(new MockFsClient());

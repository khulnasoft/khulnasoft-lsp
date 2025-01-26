import { URI } from 'vscode-uri';
import { Connection } from 'vscode-languageserver';
import {
  DidChangeWatchedFilesNotification,
  FileChangeType,
  WorkspaceFolder,
} from 'vscode-languageserver-protocol';
import { FeatureFlagService } from '../../feature_flags';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { LsConnection } from '../../external_interfaces';
import { ConfigService } from '../../config_service';
import { log } from '../../log';
import { DirectoryWalker } from './dir';
import {
  DefaultVirtualFileSystemService,
  VirtualFileSystemEvents,
} from './virtual_file_system_service';

describe('DefaultVirtualFileSystemService', () => {
  let service: DefaultVirtualFileSystemService;
  let mockDirectoryWalker: jest.Mocked<DirectoryWalker>;
  let mockWorkspaceFolder: WorkspaceFolder;
  let mockLsConnection: jest.Mocked<LsConnection>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockFeatureFlagService: jest.Mocked<FeatureFlagService>;

  beforeEach(() => {
    mockDirectoryWalker = createFakePartial<jest.Mocked<DirectoryWalker>>({
      findFilesForDirectory: jest.fn(),
    });

    mockWorkspaceFolder = {
      uri: 'file:///workspace',
      name: 'Test Workspace',
    };

    mockLsConnection = createFakePartial<jest.Mocked<LsConnection>>({
      client: createFakePartial<Connection['client']>({
        register: jest.fn().mockResolvedValue({ dispose: jest.fn() }),
      }),
      onDidChangeWatchedFiles: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    });

    mockConfigService = createFakePartial<jest.Mocked<ConfigService>>({
      get: jest.fn().mockReturnValue([mockWorkspaceFolder]),
    });

    mockFeatureFlagService = createFakePartial<jest.Mocked<FeatureFlagService>>({
      isInstanceFlagEnabled: jest.fn().mockReturnValue(false),
      updateInstanceFeatureFlags: jest.fn().mockReturnValue(Promise.resolve()),
    });

    service = new DefaultVirtualFileSystemService(
      mockLsConnection,
      mockDirectoryWalker,
      mockConfigService,
      mockFeatureFlagService,
    );
  });

  describe('setup', () => {
    describe('when DuoAdditionalContext flag is disabled', () => {
      beforeEach(() => mockFeatureFlagService.isInstanceFlagEnabled.mockReturnValue(false));

      it('should return early', async () => {
        await service.setup();

        expect(mockFeatureFlagService.updateInstanceFeatureFlags).toHaveBeenCalled();
        expect(mockDirectoryWalker.findFilesForDirectory).not.toHaveBeenCalled();
        expect(mockLsConnection.client.register).not.toHaveBeenCalled();
      });
    });

    describe('when DuoAdditionalContext flag is enabled', () => {
      beforeEach(() => mockFeatureFlagService.isInstanceFlagEnabled.mockReturnValue(true));

      it('should initialize new workspace folders', async () => {
        const workspace1 = { uri: 'file:///workspace1', name: 'Workspace 1' };
        const workspace2 = { uri: 'file:///workspace2', name: 'Workspace 2' };
        mockConfigService.get = jest
          .fn()
          .mockReturnValue({ workspaceFolders: [workspace1, workspace2] });

        const mockFiles = [URI.parse('file:///workspace1/file1.ts')];
        mockDirectoryWalker.findFilesForDirectory.mockResolvedValue(mockFiles);

        const listener = jest.fn();
        service.onFileSystemEvent(listener);

        await service.setup();

        expect(listener).toHaveBeenCalledWith(
          VirtualFileSystemEvents.WorkspaceFilesEvent,
          expect.objectContaining({
            workspaceFolder: workspace1,
            files: mockFiles,
          }),
        );
        expect(listener).toHaveBeenCalledWith(
          VirtualFileSystemEvents.WorkspaceFilesEvent,
          expect.objectContaining({
            workspaceFolder: workspace2,
            files: mockFiles,
          }),
        );
        expect(mockLsConnection.client.register).toHaveBeenCalled();
      });

      it('should not re-initialize already initialized workspaces', async () => {
        const workspace1 = { uri: 'file:///workspace1', name: 'Workspace 1' };
        mockConfigService.get = jest.fn().mockReturnValue({ workspaceFolders: [workspace1] });

        await service.setup();
        mockDirectoryWalker.findFilesForDirectory.mockClear();

        await service.setup();

        expect(mockDirectoryWalker.findFilesForDirectory).not.toHaveBeenCalled();
      });

      it('should clean up removed workspaces from initialization tracking', async () => {
        const workspace1 = { uri: 'file:///workspace1', name: 'Workspace 1' };
        const workspace2 = { uri: 'file:///workspace2', name: 'Workspace 2' };

        mockConfigService.get = jest
          .fn()
          .mockReturnValue({ workspaceFolders: [workspace1, workspace2] });

        await service.setup();

        // Second setup with workspace2 removed
        mockConfigService.get = jest.fn().mockReturnValue({ workspaceFolders: [workspace1] });

        await service.setup();

        // Third setup with workspace2 re-added - should re-initialize it
        mockConfigService.get = jest
          .fn()
          .mockReturnValue({ workspaceFolders: [workspace1, workspace2] });
        mockDirectoryWalker.findFilesForDirectory.mockClear();
        await service.setup();

        // Should have initialized workspace2 again
        expect(mockDirectoryWalker.findFilesForDirectory).toHaveBeenCalledWith({
          directoryUri: URI.parse(workspace2.uri),
        });
      });
    });
  });

  describe('emitFilesForWorkspace', () => {
    it('should emit a WorkspaceFilesEvent with the files found', async () => {
      const mockFiles = [
        URI.parse('file:///workspace/file1.ts'),
        URI.parse('file:///workspace/file2.ts'),
      ];
      mockDirectoryWalker.findFilesForDirectory.mockResolvedValue(mockFiles);

      const listener = jest.fn();
      service.onFileSystemEvent(listener);

      await service.emitFilesForWorkspace(mockWorkspaceFolder);

      expect(mockDirectoryWalker.findFilesForDirectory).toHaveBeenCalledWith({
        directoryUri: URI.parse(mockWorkspaceFolder.uri),
      });
      expect(listener).toHaveBeenCalledWith(VirtualFileSystemEvents.WorkspaceFilesEvent, {
        files: mockFiles,
        workspaceFolder: mockWorkspaceFolder,
      });
    });
  });

  describe('onFileSystemEvent', () => {
    it('should add a listener and return a disposable', () => {
      const listener = jest.fn();
      const disposable = service.onFileSystemEvent(listener);

      expect(disposable).toHaveProperty('dispose');
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('registerWatchers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should register watchers and set up file change listener', async () => {
      const registerSpy = jest.spyOn(mockLsConnection.client, 'register');
      const onDidChangeWatchedFilesSpy = jest.spyOn(mockLsConnection, 'onDidChangeWatchedFiles');

      await service.registerWatchers();
      jest.runAllTimers();

      expect(registerSpy).toHaveBeenCalledWith(
        DidChangeWatchedFilesNotification.type,
        expect.objectContaining({
          watchers: [{ globPattern: '**/*' }],
        }),
      );

      expect(onDidChangeWatchedFilesSpy).toHaveBeenCalled();
    });

    it('should handle file changes and emit events', async () => {
      const listener = jest.fn();
      service.onFileSystemEvent(listener);

      await service.registerWatchers();
      jest.runAllTimers();

      const onDidChangeWatchedFilesSpy = jest.spyOn(mockLsConnection, 'onDidChangeWatchedFiles');
      const callback = onDidChangeWatchedFilesSpy.mock.calls[0][0];

      callback({
        changes: [
          { uri: 'file:///workspace/file1.ts', type: FileChangeType.Created },
          { uri: 'file:///workspace/file2.ts', type: FileChangeType.Changed },
        ],
      });

      jest.runAllTimers();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith(
        VirtualFileSystemEvents.WorkspaceFileEvent,
        expect.objectContaining({
          fileEvent: { uri: 'file:///workspace/file1.ts', type: FileChangeType.Created },
          workspaceFolder: mockWorkspaceFolder,
        }),
      );
      expect(listener).toHaveBeenCalledWith(
        VirtualFileSystemEvents.WorkspaceFileEvent,
        expect.objectContaining({
          fileEvent: { uri: 'file:///workspace/file2.ts', type: FileChangeType.Changed },
          workspaceFolder: mockWorkspaceFolder,
        }),
      );
    });

    it('should handle errors when registering watchers', async () => {
      const logInfoSpy = jest.spyOn(log, 'info').mockImplementation();
      jest
        .mocked(mockLsConnection.client.register)
        .mockRejectedValue(new Error('Registration failed'));

      await service.registerWatchers();
      jest.runAllTimers();

      expect(logInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register watcher for workspaces'),
        expect.any(Error),
      );

      logInfoSpy.mockRestore();
    });
  });
});

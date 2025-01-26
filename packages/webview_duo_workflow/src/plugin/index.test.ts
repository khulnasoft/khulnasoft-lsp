import type { DuoWorkflowEvent, ParsedDuoWorkflowEvent } from '../types';
import { WEBVIEW_ID, WEBVIEW_TITLE } from '../contract';
import type { DuoWorkflowInitialState } from '../contract';
import mocks from './controllers_mock_data';
import * as controllers from './controllers';
import { workflowPluginFactory } from './index';

jest.mock('@khulnasoft-lsp/workflow-api');
jest.mock('vscode-languageserver');

const mockDuoWorkflowCheckpoint = {
  ts: 'someTimestamp',
  channel_values: { status: 'someStatus' },
};

const workflowEvent = {
  checkpoint: JSON.stringify(mockDuoWorkflowCheckpoint),
  workflowStatus: 'someStatus',
} as unknown as DuoWorkflowEvent;

const parsedCheckpoint = {
  ...workflowEvent,
  checkpoint: mockDuoWorkflowCheckpoint,
} as unknown as ParsedDuoWorkflowEvent;

jest.mock('./controllers', () => {
  return {
    initWorkflowController: jest.fn().mockReturnValue(mocks.workflowController),
    initWorkflowConnectionController: jest.fn().mockReturnValue(mocks.workflowConnectionController),
    initWorkflowCommonController: jest.fn().mockReturnValue(mocks.workflowCommonController),
    registerControllers: jest.fn().mockReturnValue(mocks.workflowCommonController),
  };
});

describe('workflowPluginFactory', () => {
  jest.mock('./utils', () => {
    return {
      parseLangGraphCheckpoint: jest.fn().mockReturnValue(mockDuoWorkflowCheckpoint),
    };
  });
  const getInstanceConnectedHandler = () => {
    return jest.mocked(mocks.webview.onInstanceConnected).mock.calls[0][0];
  };
  const getInitialStateHandler = (): ((state: DuoWorkflowInitialState) => void) => {
    return (jest
      .mocked(mocks.extension.onNotification)
      .mock.calls.find((call) => (call[0] as string) === 'setInitialState')?.[1] ?? jest.fn()) as (
      state: DuoWorkflowInitialState,
    ) => void;
  };

  const getAppReadyHandler = (): (() => void) => {
    return (jest
      .mocked(mocks.messageBus.onNotification)
      .mock.calls.find((call) => (call[0] as string) === 'appReady')?.[1] ??
      jest.fn()) as () => void;
  };
  describe('Plugin initialization', () => {
    it('should create a plugin with correct id and title', () => {
      const plugin = workflowPluginFactory(mocks.workflowApi, mocks.connection);
      expect(plugin.id).toBe(WEBVIEW_ID);
      expect(plugin.title).toBe(WEBVIEW_TITLE);
    });

    it('should set up event handlers correctly', () => {
      const plugin = workflowPluginFactory(mocks.workflowApi, mocks.connection);
      plugin.setup({ webview: mocks.webview, extension: mocks.extension });

      expect(mocks.extension.onNotification).toHaveBeenCalledWith(
        'setInitialState',
        expect.any(Function),
      );
      expect(mocks.webview.onInstanceConnected).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Controller setup', () => {
    it('should register controllers', () => {
      const plugin = workflowPluginFactory(mocks.workflowApi, mocks.connection);
      plugin.setup({ webview: mocks.webview, extension: mocks.extension });

      const instanceConnectedHandler = getInstanceConnectedHandler();
      instanceConnectedHandler(mocks.webviewInstanceId, mocks.messageBus);

      expect(controllers.registerControllers).toHaveBeenCalledWith(
        mocks.messageBus,
        expect.any(Array),
      );
    });
  });

  describe('Event handling', () => {
    let plugin: ReturnType<typeof workflowPluginFactory>;
    let initialState: DuoWorkflowInitialState;

    beforeEach(() => {
      plugin = workflowPluginFactory(mocks.workflowApi, mocks.connection);
      plugin.setup({ webview: mocks.webview, extension: mocks.extension });
    });

    afterEach(() => {
      const setInitialStateHandler = getInitialStateHandler();
      setInitialStateHandler({});
    });

    it('should handle webview instance connection', () => {
      const instanceConnectedHandler = getInstanceConnectedHandler();
      instanceConnectedHandler(mocks.webviewInstanceId, mocks.messageBus);

      expect(mocks.messageBus.onNotification).toHaveBeenCalledWith(
        'appReady',
        expect.any(Function),
      );
    });

    it('should handle workflow subscription callback', async () => {
      const instanceConnectedHandler = getInstanceConnectedHandler();
      instanceConnectedHandler(mocks.webviewInstanceId, mocks.messageBus);

      const { mock } = jest.mocked(controllers.initWorkflowController);
      const subscriptionCallback = mock.calls[mock.calls.length - 1][1];

      subscriptionCallback(workflowEvent);

      expect(mocks.messageBus.sendNotification).toHaveBeenCalledWith(
        'workflowCheckpoint',
        parsedCheckpoint,
      );
      expect(mocks.messageBus.sendNotification).toHaveBeenCalledWith(
        'workflowStatus',
        'someStatus',
      );
    });

    describe('appReady notification', () => {
      it('should handle appReady notification', () => {
        const instanceConnectedHandler = getInstanceConnectedHandler();
        instanceConnectedHandler(mocks.webviewInstanceId, mocks.messageBus);

        const appReadyHandler = getAppReadyHandler();
        appReadyHandler();

        expect(mocks.messageBus.sendNotification).toHaveBeenCalledWith('initialState', {});
      });

      it('should reset the intialStateCache after it sends it', () => {
        initialState = { someKey: 'someValue' };
        const setInitialStateHandler = getInitialStateHandler();
        setInitialStateHandler(initialState);

        const instanceConnectedHandler = getInstanceConnectedHandler();
        instanceConnectedHandler(mocks.webviewInstanceId, mocks.messageBus);

        const appReadyHandler = getAppReadyHandler();

        appReadyHandler();

        expect(mocks.messageBus.sendNotification).toHaveBeenCalledWith('initialState', {
          someKey: 'someValue',
        });

        appReadyHandler();

        expect(mocks.messageBus.sendNotification).toHaveBeenCalledWith('initialState', {});
      });

      it('should send the cached initial state on appReady notification', () => {
        initialState = { someKey: 'someValue' };
        const setInitialStateHandler = getInitialStateHandler();
        setInitialStateHandler(initialState);

        const instanceConnectedHandler = getInstanceConnectedHandler();
        instanceConnectedHandler(mocks.webviewInstanceId, mocks.messageBus);

        const appReadyHandler = getAppReadyHandler();

        appReadyHandler();

        expect(mocks.messageBus.sendNotification).toHaveBeenCalledWith('initialState', {
          someKey: 'someValue',
        });
      });
    });
  });
});

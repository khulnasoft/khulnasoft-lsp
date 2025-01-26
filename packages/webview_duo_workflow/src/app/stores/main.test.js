import { setActivePinia, createPinia } from 'pinia';
import * as bridgeModule from '../../common/bridge';
import { useMainStore } from './main';
import { useHealthCheckStore } from './health_check';

describe('Main Store', () => {
  let mainStore;
  let healthStore;

  const mockSendRequest = jest.fn();

  beforeEach(() => {
    jest.spyOn(bridgeModule, 'sendRequest').mockImplementation(mockSendRequest);

    setActivePinia(createPinia());

    mainStore = useMainStore();
    healthStore = useHealthCheckStore();
    healthStore.setProjectValid = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getProjectPath', () => {
    it('sends the getProjectPath event', () => {
      mainStore.getProjectPath();
      expect(mockSendRequest).toHaveBeenCalledWith('getProjectPath');
    });

    it('sets isLoadingProjectPath to true', () => {
      mainStore.getProjectPath();
      expect(mainStore.isLoadingProjectPath).toBe(true);
    });

    describe('when no path is returned', () => {
      beforeEach(() => {
        mainStore.setProjectPath(null);
      });

      it('calls setProjectValid with false', () => {
        expect(healthStore.setProjectValid).toHaveBeenCalledWith(false);
      });
    });

    describe('when a path is returned', () => {
      beforeEach(() => {
        mainStore.setProjectPath('/path/to/project');
      });

      it('does not call setProjectValid', () => {
        expect(healthStore.setProjectValid).not.toHaveBeenCalled();
      });
    });
  });

  describe('setProjectPath', () => {
    it('sets the projectPath value', () => {
      mainStore.setProjectPath('test-project');
      expect(mainStore.projectPath).toBe('test-project');
    });

    it('sets isLoadingProjectPath to false', () => {
      mainStore.setProjectPath('test-project');
      expect(mainStore.isLoadingProjectPath).toBe(false);
    });
  });

  describe('notifyAppReady', () => {
    it('sends appReady request', () => {
      mainStore.notifyAppReady();
      expect(mockSendRequest).toHaveBeenCalledWith('appReady');
    });
  });

  describe('openUrl', () => {
    it('sends openUrl request with the provided URL', () => {
      const testUrl = 'https://example.com';
      mainStore.openUrl(testUrl);
      expect(mockSendRequest).toHaveBeenCalledWith('openUrl', { url: testUrl });
    });
  });

  describe('stopSubscriptions', () => {
    it('sends stopSubscriptions request', () => {
      mainStore.stopSubscriptions();
      expect(mockSendRequest).toHaveBeenCalledWith('stopSubscriptions');
    });
  });
});

import { defineStore } from 'pinia';
import { sendRequest } from '../../common/bridge';
import { useHealthCheckStore } from './health_check';

export const useMainStore = defineStore('main', {
  state: () => ({
    isLoadingProjectPath: false,
    projectPath: null,
  }),
  actions: {
    getProjectPath() {
      this.isLoadingProjectPath = true;

      sendRequest('getProjectPath');
    },
    notifyAppReady() {
      sendRequest('appReady');
    },

    openUrl(url) {
      sendRequest('openUrl', { url });
    },
    setProjectPath(projectPath) {
      this.isLoadingProjectPath = false;
      this.projectPath = projectPath;

      if (!projectPath) {
        const healthCheckStore = useHealthCheckStore();
        healthCheckStore.setProjectValid(false);
      }
    },
    stopSubscriptions() {
      sendRequest('stopSubscriptions');
    },
  },
  events: {
    setProjectPath: 'setProjectPath',
  },
});

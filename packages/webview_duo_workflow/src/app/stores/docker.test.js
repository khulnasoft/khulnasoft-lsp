import { setActivePinia, createPinia } from 'pinia';
import * as bridgeModule from '../../common/bridge';
import { DEFAULT_DOCKER_IMAGE } from '../constants.ts';
import { useDockerStore, DOCKER_STATES } from './docker';

describe('Docker Store', () => {
  let store;

  const mockSendRequest = jest.fn();

  beforeEach(() => {
    jest.spyOn(bridgeModule, 'sendRequest').mockImplementation(mockSendRequest);

    setActivePinia(createPinia());
    store = useDockerStore();
  });

  it('initializes with default state', () => {
    expect(store.dockerImage).toBe(DEFAULT_DOCKER_IMAGE);
    expect(store.status).toBe(DOCKER_STATES.NOT_CONFIGURED);
  });

  describe('pullDockerImageCompleted', () => {
    it('updates state correctly', () => {
      store.pullDockerImageCompleted({ success: true });
      expect(store.status).toBe(DOCKER_STATES.IMAGE_PULLED);
    });

    it('updates state on failure', () => {
      store.pullDockerImageCompleted({ success: false });
      expect(store.status).toBe(DOCKER_STATES.IMAGE_FAILED);
    });
  });

  describe('pullDockerImage', () => {
    it('sets loading state and sends request', () => {
      store.pullDockerImage();

      expect(store.status).toBe(DOCKER_STATES.PULLING_IMAGE);
      expect(mockSendRequest).toHaveBeenCalledWith('pullDockerImage', DEFAULT_DOCKER_IMAGE);
    });
  });

  describe('setDockerAvailable', () => {
    it('updates status when image needs to be pulled', () => {
      store.setDockerAvailable(false);

      expect(store.status).toBe(DOCKER_STATES.PULLING_IMAGE);
    });

    it('updates status when image is pulled', () => {
      store.setDockerAvailable(true);

      expect(store.status).toBe(DOCKER_STATES.IMAGE_PULLED);
    });
  });

  describe('verifyDockerImage', () => {
    it('sends request to verify docker image', () => {
      store.verifyDockerImage();

      expect(mockSendRequest).toHaveBeenCalledWith('verifyDockerImage', DEFAULT_DOCKER_IMAGE);
    });
  });
});

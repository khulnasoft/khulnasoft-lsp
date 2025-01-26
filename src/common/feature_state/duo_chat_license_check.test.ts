import { Disposable } from '@khulnasoft/disposable';
import { ApiReconfiguredData } from '@khulnasoft/core';
import { KhulnaSoftApiClient } from '../api';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { InvalidInstanceVersionError } from '../fetch_error';
import { DefaultDuoChatLicenseCheck } from './duo_chat_license_check';
import { CHAT_NO_LICENSE } from './feature_state_management_types';

describe('DuoChatLicenseCheck', () => {
  const disposables: Disposable[] = [];

  let mockApi: KhulnaSoftApiClient;
  let listeners: Array<(data: ApiReconfiguredData) => void> = [];

  let check: DefaultDuoChatLicenseCheck;

  const checkEngagedChangeListener = jest.fn();

  beforeEach(() => {
    mockApi = createFakePartial<KhulnaSoftApiClient>({
      fetchFromApi: jest.fn(),
      onApiReconfigured: jest.fn((listener) => {
        listeners.push(listener);
        return { dispose: () => {} };
      }),
    });

    check = new DefaultDuoChatLicenseCheck(mockApi);
    disposables.push(check.onChanged(checkEngagedChangeListener));
  });

  afterEach(() => {
    listeners = [];

    while (disposables.length > 0) {
      disposables.pop()!.dispose();
    }
  });

  const reconfigureApi = async (
    data: ApiReconfiguredData = createFakePartial<ApiReconfiguredData>({ isInValidState: true }),
  ) => {
    listeners.forEach((listener) => listener(data));

    await new Promise(process.nextTick);
  };

  describe('is updated on config change"', () => {
    it('should include minimum query version in the request', async () => {
      const mockResponse = {
        currentUser: {
          duoChatAvailable: false,
        },
      };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      await reconfigureApi();

      expect(mockApi.fetchFromApi).toHaveBeenCalledWith({
        type: 'graphql',
        query: expect.any(String),
        variables: {},
        supportedSinceInstanceVersion: {
          version: '16.8.0',
          resourceName: 'get current user Duo Chat license',
        },
      });
    });

    it('should not update availability if the instance version is under 16.8.0', async () => {
      jest
        .mocked(mockApi.fetchFromApi)
        .mockRejectedValueOnce(new InvalidInstanceVersionError('Instance version is under 16.8.0'));

      await reconfigureApi();

      expect(check.engaged).toBe(true);
      expect(checkEngagedChangeListener).not.toHaveBeenCalled();
    });

    it('should be engaged when license is NOT available', async () => {
      const mockResponse = {
        currentUser: {
          duoChatAvailable: false,
        },
      };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      await reconfigureApi();

      expect(check.engaged).toBe(true);
    });

    it('should NOT be engaged when license is available', async () => {
      const mockResponse = {
        currentUser: {
          duoChatAvailable: true,
        },
      };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      await reconfigureApi();

      expect(check.engaged).toBe(false);
    });

    it('should be engaged when check for license failed', async () => {
      jest.mocked(mockApi.fetchFromApi).mockRejectedValue(new Error('API Error'));

      await reconfigureApi();

      expect(check.engaged).toBe(true);
    });
  });

  describe('api reconfigured', () => {
    it('emits api is reconfigured in a valid state', async () => {
      await reconfigureApi();

      expect(checkEngagedChangeListener).toHaveBeenCalledTimes(1);
    });

    it('does not emit when api is reconfigured in an invalid state', async () => {
      await reconfigureApi();
      jest.mocked(checkEngagedChangeListener).mockClear();

      await reconfigureApi({ isInValidState: false, validationMessage: 'error' });

      expect(checkEngagedChangeListener).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should validate the license using configuration baseUrl and token', async () => {
      const mockResponse = {
        currentUser: {
          duoChatAvailable: false,
        },
      };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      await check.validate({ baseUrl: 'https://new-gitlab.com', token: 'glpat-1234567' });

      expect(mockApi.fetchFromApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://new-gitlab.com',
          token: 'glpat-1234567',
        }),
      );
    });

    it('should not be valid if the license is not available', async () => {
      const mockResponse = {
        currentUser: {
          duoChatAvailable: false,
        },
      };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      const result = await check.validate({
        baseUrl: 'https://new-gitlab.com',
        token: 'glpat-1234567',
      });

      expect(result?.checkId).toBe(CHAT_NO_LICENSE);
      expect(result?.details).not.toBeUndefined();
    });

    it('should be valid if the license is available', async () => {
      const mockResponse = {
        currentUser: {
          duoChatAvailable: true,
        },
      };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      const result = await check.validate({
        baseUrl: 'https://new-gitlab.com',
        token: 'glpat-1234567',
      });

      expect(result).toBeUndefined();
    });
  });
});

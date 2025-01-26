import { Disposable } from '@khulnasoft/disposable';
import { ApiReconfiguredData } from '@khulnasoft/core';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { KhulnaSoftApiClient } from '../api';
import { DefaultCodeSuggestionsDuoLicenseCheck } from './code_suggestions_duo_license_check';

describe('DefaultCodeSuggestionsDuoLicenseCheck', () => {
  const disposables: Disposable[] = [];

  let listeners: Array<(data: ApiReconfiguredData) => void> = [];

  let check: DefaultCodeSuggestionsDuoLicenseCheck;
  let mockApi: KhulnaSoftApiClient;

  const checkEngagedChangeListener = jest.fn();

  beforeEach(() => {
    mockApi = createFakePartial<KhulnaSoftApiClient>({
      fetchFromApi: jest.fn(),
      onApiReconfigured: jest.fn((listener) => {
        listeners.push(listener);
        return { dispose: () => {} };
      }),
    });

    check = new DefaultCodeSuggestionsDuoLicenseCheck(mockApi);
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
    it('should be engaged when license is NOT available', async () => {
      const mockResponse = {
        currentUser: {
          duoCodeSuggestionsAvailable: false,
        },
      };

      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      await reconfigureApi();

      expect(check.engaged).toBe(true);
    });

    it('should NOT be engaged when license is available', async () => {
      const mockResponse = {
        currentUser: {
          duoCodeSuggestionsAvailable: true,
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
      jest.mocked(checkEngagedChangeListener).mockClear();

      await reconfigureApi();

      expect(checkEngagedChangeListener).toHaveBeenCalledTimes(1);
    });

    it('does not emit when api is reconfigured in an invalid state', async () => {
      await reconfigureApi();
      jest.mocked(checkEngagedChangeListener).mockClear();

      await reconfigureApi({ isInValidState: false, validationMessage: 'error' });

      await new Promise(process.nextTick);
      expect(checkEngagedChangeListener).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should have no engaged checks when license is available', async () => {
      const mockResponse = {
        currentUser: {
          duoCodeSuggestionsAvailable: true,
        },
      };

      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      const result = await check.validate({});

      expect(result).toBeUndefined();
    });

    it('should have an engaged check when license is not available', async () => {
      const mockResponse = {
        currentUser: {
          duoCodeSuggestionsAvailable: false,
        },
      };

      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      const result = await check.validate({});

      expect(result).toEqual({
        checkId: 'code-suggestions-no-license',
        details:
          'Code Suggestions is now a paid feature, part of Duo Pro. Contact your KhulnaSoft administrator to upgrade',
        engaged: true,
      });
    });
  });
});

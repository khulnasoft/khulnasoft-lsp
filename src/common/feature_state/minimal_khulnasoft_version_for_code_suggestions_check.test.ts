import { Disposable } from '@khulnasoft/disposable';
import { DefaultConfigService } from '../config_service';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { KhulnaSoftApiClient } from '../api';
import { DefaultCodeSuggestionsInstanceVersionCheck } from './minimal_gitlab_version_for_code_suggestions_check';
import { UNSUPPORTED_KHULNASOFT_VERSION } from './feature_state_management_types';

describe('DefaultCodeSuggestionsInstanceVersionCheck', () => {
  const disposables: Disposable[] = [];

  let check: DefaultCodeSuggestionsInstanceVersionCheck;
  let mockApi: KhulnaSoftApiClient;
  const configService = new DefaultConfigService();
  const checkEngagedChangeListener = jest.fn();

  beforeEach(() => {
    mockApi = createFakePartial<KhulnaSoftApiClient>({
      fetchFromApi: jest.fn(),
    });

    check = new DefaultCodeSuggestionsInstanceVersionCheck(mockApi, configService);
    disposables.push(check.onChanged(checkEngagedChangeListener));
  });

  afterEach(() => {
    while (disposables.length > 0) {
      disposables.pop()!.dispose();
    }
  });

  const updateConfig = async (
    { token, baseUrl }: { token?: string; baseUrl?: string } = {
      token: 'glpat-123',
      baseUrl: 'http://test.com',
    },
  ) => {
    if (token) {
      configService.set('client.token', token);
    }

    if (baseUrl) {
      configService.set('client.baseUrl', baseUrl);
    }

    await new Promise(process.nextTick);
  };

  describe('is updated on config change"', () => {
    it.each`
      version
      ${'16.8.0'}
      ${'16.9.3'}
      ${'16.9.0-pre'}
      ${'16.9.0-pre-1'}
      ${'16.12.4'}
      ${'20.0.0'}
    `('is not engaged when version is $version', async ({ version }) => {
      jest.mocked(mockApi.fetchFromApi).mockResolvedValue({ version });
      await updateConfig({ baseUrl: `http://test-${version}.com` });

      expect(check.engaged).toBe(false);
    });

    it(`is engaged and sets correct message when version is below 16.8`, async () => {
      jest.mocked(mockApi.fetchFromApi).mockResolvedValue({ version: '16.7.1' });
      await updateConfig();

      expect(check.engaged).toBe(true);
      expect(check.details).toBe(
        `KhulnaSoft Duo Code Suggestions requires KhulnaSoft version 16.8 or later. KhulnaSoft instance located at: http://test.com is currently using 16.7.1`,
      );
    });
  });

  describe('change event', () => {
    beforeEach(() => {
      jest.mocked(mockApi.fetchFromApi).mockResolvedValue({ version: '16.8.3' });
    });
    it('emits after `token` is updated', async () => {
      await updateConfig();

      jest.mocked(checkEngagedChangeListener).mockClear();
      await updateConfig({ token: 'glpat-126' });

      expect(checkEngagedChangeListener).toHaveBeenCalledTimes(1);
    });

    it('emits after `baseUrl` is updated', async () => {
      await updateConfig();
      jest.mocked(checkEngagedChangeListener).mockClear();

      await updateConfig({ baseUrl: 'http://test2.com' });

      expect(checkEngagedChangeListener).toHaveBeenCalledTimes(1);
    });

    it('does not emit when unrelated config is updated', async () => {
      await updateConfig();
      jest.mocked(checkEngagedChangeListener).mockClear();
      configService.set('client.telemetry.enabled', false);
      await new Promise(process.nextTick);
      expect(checkEngagedChangeListener).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should have no engaged checks when version supports code suggestions', async () => {
      const mockResponse = { version: '16.8.0' };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      const result = await check.validate({ baseUrl: 'http://test.com', token: 'glpat-123' });

      expect(mockApi.fetchFromApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://test.com',
          token: 'glpat-123',
        }),
      );
      expect(result).toBeUndefined();
    });

    it('should have an engaged check when version does not support code suggestions', async () => {
      const mockResponse = { version: '16.7.0' };
      jest.mocked(mockApi.fetchFromApi).mockResolvedValueOnce(mockResponse);

      const result = await check.validate({ baseUrl: 'http://test.com', token: 'glpat-123' });

      expect(mockApi.fetchFromApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://test.com',
          token: 'glpat-123',
        }),
      );
      expect(result).toEqual({
        checkId: UNSUPPORTED_KHULNASOFT_VERSION,
        details:
          'KhulnaSoft Duo Code Suggestions requires KhulnaSoft version 16.8 or later. Current version is 16.7.0.',
        engaged: true,
      });
    });

    it('should throw an error when API call fails', async () => {
      jest.mocked(mockApi.fetchFromApi).mockRejectedValueOnce(new Error('API Error'));

      await expect(
        check.validate({ baseUrl: 'http://test.com', token: 'glpat-123' }),
      ).rejects.toThrow('API Error');
    });
  });
});

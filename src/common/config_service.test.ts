import { DefaultConfigService } from './config_service';
import { LOG_LEVEL } from './log_types';
import { KHULNASOFT_API_BASE_URL } from './constants';

describe('ConfigService', () => {
  let service: DefaultConfigService;

  beforeEach(() => {
    service = new DefaultConfigService();
  });

  it('starts with default config', async () => {
    expect(service.get()).toEqual({
      client: {
        baseUrl: KHULNASOFT_API_BASE_URL,
        codeCompletion: {
          enableSecretRedaction: true,
        },
        telemetry: {
          enabled: true,
        },
        logLevel: LOG_LEVEL.INFO,
        ignoreCertificateErrors: false,
        httpAgentOptions: {},
        duo: {
          enabledWithoutGitlabProject: true,
        },
        featureFlagOverrides: {},
      },
    });
  });

  describe('setting property', () => {
    it('can set a property', async () => {
      const url = 'http://test.url';
      service.set('client.baseUrl', url);

      expect(service.get('client.baseUrl')).toBe(url);
    });

    it('triggers an event', async () => {
      const listener = jest.fn();
      service.onConfigChange(listener);
      const url = 'http://test.url';

      service.set('client.baseUrl', url);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ client: expect.objectContaining({ baseUrl: url }) }),
      );
    });
  });

  describe('merge config with partial config', () => {
    it('defined source values will override default config', async () => {
      service.merge({
        client: {
          baseUrl: 'http://test.url',
          telemetry: { enabled: false },
        },
      });

      expect(service.get('client.baseUrl')).toBe('http://test.url');
      expect(service.get('client.telemetry')).toEqual(expect.objectContaining({ enabled: false }));
    });

    it('keeps previous config when merging with empty config', () => {
      service.merge({
        client: {
          telemetry: {
            baseUrl: 'test',
          },
        },
      });

      service.merge({});

      expect(service.get('client.telemetry')).toEqual(
        expect.objectContaining({
          baseUrl: 'test',
        }),
      );
    });

    it('should keep previous configuration during partial updates', () => {
      // setting some initial configuration
      service.merge({
        client: {
          telemetry: {
            baseUrl: 'test',
            enabled: false,
          },
        },
      });

      // partially overriding the initial configuration
      service.merge({
        client: {
          telemetry: {
            baseUrl: 'hello',
          },
        },
      });

      expect(service.get('client.telemetry')).toEqual(
        expect.objectContaining({
          baseUrl: 'hello',
          enabled: false,
        }),
      );
    });

    it('triggers an event', async () => {
      const listener = jest.fn();
      service.onConfigChange(listener);
      const url = 'http://test.url';

      service.merge({
        client: {
          baseUrl: url,
        },
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ client: expect.objectContaining({ baseUrl: url }) }),
      );
    });

    it('should use source config values for arrays', async () => {
      service.set('client.codeCompletion.additionalLanguages', ['css']);
      expect(service.get('client.codeCompletion.additionalLanguages')).toContain('css');
      service.merge({
        client: {
          codeCompletion: {
            additionalLanguages: [],
          },
        },
      });

      expect(service.get('client.codeCompletion.additionalLanguages')).not.toContain('css');
    });

    it('should use default config values when value is missing in source config', () => {
      expect(service.get('client.baseUrl')).toBe(KHULNASOFT_API_BASE_URL);
      service.merge({
        client: {
          baseUrl: undefined,
        },
      });

      expect(service.get('client.baseUrl')).toBe(KHULNASOFT_API_BASE_URL);
    });
  });
});

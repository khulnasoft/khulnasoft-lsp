import { ConfigService, DefaultConfigService } from '../../config_service';
import { SAAS_INSTANCE_URL } from '../constants';
import {
  DefaultStandardContext,
  StandardContext,
  STANDARD_CONTEXT_SCHEMA,
  environmentFromHost,
  ENVIRONMENT_URLS,
  ENVIRONMENT_NAMES,
} from './standard_context';

describe('DefaultStandardContext', () => {
  let configService: ConfigService;
  let standardContext: StandardContext;

  beforeEach(() => {
    configService = new DefaultConfigService();

    configService.set('client.telemetry.extension', { name: 'Test Extension' });
    configService.set('client.baseUrl', SAAS_INSTANCE_URL);
    standardContext = new DefaultStandardContext(configService);
  });

  describe('initialization', () => {
    it('should initialize the context with the given config data', () => {
      const result = standardContext.build();

      expect(result.data.source).toBe('Test Extension');
      expect(result.data.host_name).toBe('https://gitlab.com');
      expect(result.data.environment).toBe('production');
    });

    it('should update context on config change', () => {
      const newConfig = {
        client: {
          telemetry: {
            extension: { name: 'New Extension' },
          },
          baseUrl: 'https://staging.gitlab.com',
        },
      };
      configService.merge(newConfig);
      const result = standardContext.build();

      expect(result.data.source).toBe('New Extension');
      expect(result.data.host_name).toBe('https://staging.gitlab.com');
      expect(result.data.environment).toBe('staging');
    });
  });

  describe('environmentFromHost', () => {
    it.each`
      url                                    | expectedEnvironment
      ${ENVIRONMENT_URLS.KHULNASOFT_COM}         | ${ENVIRONMENT_NAMES.KHULNASOFT_COM}
      ${ENVIRONMENT_URLS.KHULNASOFT_STAGING}     | ${ENVIRONMENT_NAMES.KHULNASOFT_STAGING}
      ${ENVIRONMENT_URLS.KHULNASOFT_ORG}         | ${ENVIRONMENT_NAMES.KHULNASOFT_ORG}
      ${ENVIRONMENT_URLS.KHULNASOFT_DEVELOPMENT} | ${ENVIRONMENT_NAMES.KHULNASOFT_DEVELOPMENT}
      ${'http://localhost:3000'}             | ${ENVIRONMENT_NAMES.KHULNASOFT_DEVELOPMENT}
      ${'https://custom.gitlab.com'}         | ${ENVIRONMENT_NAMES.KHULNASOFT_SELF_MANAGED}
    `('when URL is "$url" should return "$expectedEnvironment"', ({ url, expectedEnvironment }) => {
      const environment = environmentFromHost(url);
      expect(environment).toBe(expectedEnvironment);
    });
  });

  describe('build', () => {
    it('should build a valid SelfDescribingJson with default values', () => {
      const result = standardContext.build();

      expect(result).toEqual({
        schema: STANDARD_CONTEXT_SCHEMA,
        data: {
          source: 'Test Extension',
          extra: undefined,
          environment: 'production',
          host_name: 'https://gitlab.com',
        },
      });
    });

    it('should include extra fields if provided', () => {
      const extra = { foo: 'bar', baz: 'qux' };
      const result = standardContext.build(extra);

      expect(result.data.extra).toEqual(extra);
    });
  });
});

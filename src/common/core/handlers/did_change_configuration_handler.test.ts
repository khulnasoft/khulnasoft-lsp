import { TestLogger } from '@khulnasoft/logging';
import { ConfigService, DefaultConfigService, ClientConfig } from '../../config_service';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { DuoWorkspaceProjectAccessCache } from '../../services/duo_access';
import { VirtualFileSystemService } from '../../services/fs/virtual_file_system_service';
import { LOG_LEVEL } from '../../log_types';
import { DefaultDidChangeConfigurationHandler } from './did_change_configuration_handler';

describe('DidChangeConfigurationHandler', () => {
  let configService: ConfigService;
  let handler: DefaultDidChangeConfigurationHandler;
  let logger: TestLogger;

  const mockInstanceId = '1';
  const mockGlobalUserId = '2';
  const mockHostName = 'https://test.gitlab.com';
  const mockDuoProNamespaceIds = [3, 4, 5];
  const mockSnowplowTrackerOptions = {
    gitlab_instance_id: mockInstanceId,
    gitlab_global_user_id: mockGlobalUserId,
    gitlab_host_name: mockHostName,
    gitlab_saas_duo_pro_namespace_ids: mockDuoProNamespaceIds,
  };

  const duoProjectAccessCache = createFakePartial<DuoWorkspaceProjectAccessCache>({
    updateCache: jest.fn(),
  });

  const virtualFileSystemService = createFakePartial<VirtualFileSystemService>({
    setup: jest.fn(),
  });

  beforeEach(() => {
    configService = new DefaultConfigService();

    logger = new TestLogger();

    handler = new DefaultDidChangeConfigurationHandler(
      configService,
      duoProjectAccessCache,
      virtualFileSystemService,
      logger,
    );
  });

  it('passes client config to ConfigService', async () => {
    const expectedConfig: ClientConfig = {
      baseUrl: 'https://test.url',
      codeCompletion: {
        enableSecretRedaction: false,
      },
      telemetry: {
        enabled: false,
        trackingUrl: 'https://telemetry.url',
      },
      logLevel: LOG_LEVEL.DEBUG,
      ignoreCertificateErrors: false,
      httpAgentOptions: {},
      snowplowTrackerOptions: mockSnowplowTrackerOptions,
      duo: {
        enabledWithoutGitlabProject: true,
      },
      featureFlagOverrides: {},
    };
    await handler.notificationHandler({
      settings: expectedConfig,
    });

    expect(configService.get('client')).toEqual(expectedConfig);
  });

  it('validates the new configuration', async () => {
    await handler.notificationHandler({
      settings: {
        codeCompletion: {
          enabled: 'a',
          enableSecretRedaction: 'b',
          additionalLanguages: [1],
          disabledSupportedLanguages: [true],
        } as unknown as ClientConfig['codeCompletion'],
      },
    });
    expect(logger.errorLogs[0].message).toContain('The configuration is not valid');
    const errorMessage = (logger.errorLogs[0].error as { message: string })?.message;
    expect(errorMessage).toContain(
      'settings.codeCompletion: Expected boolean, received string at "enabled"; Expected boolean, received string at "enableSecretRedaction"; Expected string, received number at "additionalLanguages[0]"; Expected string, received boolean at "disabledSupportedLanguages[0]"',
    );
    expect(errorMessage).toContain(
      'Config received {"enabled":"a","enableSecretRedaction":"b","additionalLanguages":[1],"disabledSupportedLanguages":[true]}',
    );
    expect(errorMessage).toContain(
      'Example of a correct format: {"enabled":true,"enableSecretRedaction":true,"additionalLanguages":["clojure"],"disabledSupportedLanguages":["handlebars"]}',
    );
  });
});

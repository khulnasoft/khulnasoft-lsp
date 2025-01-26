import { CancellationToken } from 'vscode-languageserver-protocol';
import { ConfigService, DefaultConfigService } from '../../config_service';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import {
  DefaultInitializeHandler,
  InitializeHandler,
  CustomInitializeParams,
} from './initialize_handler';

describe('InitializeHandler', () => {
  const customInitializeParams: CustomInitializeParams = createFakePartial<CustomInitializeParams>({
    clientInfo: { name: 'Web IDE', version: '1.0.0' },
    workspaceFolders: [],
    initializationOptions: {
      baseAssetsUrl: '/assets/',
    },
  });
  let configService: ConfigService;
  let handler: InitializeHandler;
  const token = createFakePartial<CancellationToken>({});

  beforeEach(() => {
    configService = new DefaultConfigService();

    handler = new DefaultInitializeHandler(configService);

    jest.spyOn(configService, 'set');
  });

  it('stores clientInfo in configService, api service', async () => {
    await handler.requestHandler(customInitializeParams, token);
    expect(configService.set).toHaveBeenCalledWith(
      'client.clientInfo',
      customInitializeParams.clientInfo,
    );
  });

  it('stores workspaceFolders in configService', async () => {
    await handler.requestHandler(customInitializeParams, token);
    expect(configService.set).toHaveBeenCalledWith(
      'client.workspaceFolders',
      customInitializeParams.workspaceFolders,
    );
  });

  it('stores baseAssetsUrl in configService', async () => {
    await handler.requestHandler(customInitializeParams, token);
    expect(configService.set).toHaveBeenCalledWith(
      'client.baseAssetsUrl',
      customInitializeParams.initializationOptions.baseAssetsUrl,
    );
  });

  it.each`
    initializationOptions | clientContext
    ${{ ide: { name: 'Web IDE' }, extension: { name: 'Workflow Extension' } }} | ${{
  ide: { name: 'Web IDE' },
  extension: { name: 'Workflow Extension' },
}}
    ${{ extension: { name: 'Workflow Extension' } }} | ${{
  ide: customInitializeParams.clientInfo,
  extension: { name: 'Workflow Extension' },
}}
    ${{}}                 | ${{ ide: customInitializeParams.clientInfo }}
  `('initializes tracker', async ({ initializationOptions, clientContext }) => {
    await handler.requestHandler(
      {
        ...customInitializeParams,
        initializationOptions,
      },
      token,
    );
    expect(configService.set).toHaveBeenCalledWith('client.telemetry.ide', clientContext.ide);
    expect(configService.set).toHaveBeenCalledWith(
      'client.telemetry.extension',
      clientContext.extension,
    );
  });
});

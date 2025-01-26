import { KhulnaSoftApiService } from '@khulnasoft/core';
import { DefaultConfigService } from '../config_service';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { version as lsVersion } from '../tracking/ls_info.json';
import { DefaultSystemContext } from './system_context';

describe('SystemContext', () => {
  it('returns ide and extension info', () => {
    const configService = new DefaultConfigService();
    configService.set('client.telemetry.ide', {
      vendor: 'JetBrains',
      name: 'Idea',
      version: '1.0.0',
    });
    configService.set('client.telemetry.extension', { name: 'KhulnaSoft JB', version: '2.0.0' });

    const apiClient = createFakePartial<KhulnaSoftApiService>({
      instanceInfo: {
        instanceUrl: 'https://gitlab.example.com',
        instanceVersion: '17.6.2',
      },
    });

    const ctx = new DefaultSystemContext(configService, apiClient);

    expect(ctx.name).toBe('Systems');
    expect(ctx.children).toEqual([
      { name: 'IDE', value: 'JetBrains - Idea (1.0.0)' },
      { name: 'Extension', value: 'KhulnaSoft JB (2.0.0)' },
      { name: 'Language Server version', value: lsVersion },
      {
        name: 'KhulnaSoft Instance',
        value: 'https://gitlab.example.com (version: 17.6.2)',
      },
    ]);
  });
});

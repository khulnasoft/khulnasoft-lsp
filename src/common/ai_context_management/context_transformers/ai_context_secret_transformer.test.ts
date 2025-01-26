import type { Logger } from '@khulnasoft/logging';
import { createMockLogger } from '@khulnasoft/webview/src/test_utils/mocks';
import type { AIContextItem } from '@khulnasoft/ai-context';
import type { ConfigService } from '../../config_service';
import type { SecretRedactor } from '../../secret_redaction';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { OPEN_TAB_FILE } from '../test_utils/mock_data';
import { DefaultSecretContextTransformer } from './ai_context_secret_transformer';

describe('DefaultSecretContextTransformer', () => {
  let transformer: DefaultSecretContextTransformer;
  let mockLogger: Logger;
  let mockConfigService: ConfigService;
  let mockSecretRedactor: SecretRedactor;
  let mockContextItem: AIContextItem;

  beforeEach(() => {
    mockContextItem = {
      ...OPEN_TAB_FILE,
      content: 'Wow very secret: un-redacted content.',
    };

    mockLogger = createMockLogger();

    mockConfigService = createFakePartial<ConfigService>({
      get: jest.fn().mockReturnValue(true),
    });

    mockSecretRedactor = createFakePartial<SecretRedactor>({
      redactSecrets: jest.fn().mockReturnValue('redacted content'),
    });

    transformer = new DefaultSecretContextTransformer(
      mockLogger,
      mockConfigService,
      mockSecretRedactor,
    );
  });

  describe('transform', () => {
    it('redacts secrets from content when enabled', async () => {
      const result = await transformer.transform(mockContextItem);

      expect(mockSecretRedactor.redactSecrets).toHaveBeenCalledWith(
        mockContextItem.content,
        mockContextItem.id,
      );
      expect(result).toEqual({
        ...mockContextItem,
        content: 'redacted content',
      });
    });

    it('skips transformation when secret redaction is disabled', async () => {
      mockConfigService.get = jest.fn().mockReturnValue(false);

      const result = await transformer.transform(mockContextItem);

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'client.codeCompletion.enableSecretRedaction',
      );
      expect(mockSecretRedactor.redactSecrets).not.toHaveBeenCalled();
      expect(result).toEqual(mockContextItem);
    });

    it('returns item unchanged when content is undefined', async () => {
      const itemWithoutContent = { ...mockContextItem, content: undefined };

      const result = await transformer.transform(itemWithoutContent);

      expect(mockSecretRedactor.redactSecrets).not.toHaveBeenCalled();
      expect(result).toEqual(itemWithoutContent);
    });
  });
});

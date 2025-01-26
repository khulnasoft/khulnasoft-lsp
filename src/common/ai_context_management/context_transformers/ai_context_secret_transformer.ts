import { Injectable } from '@khulnasoft/di';
import { Logger, withPrefix } from '@khulnasoft/logging';
import type { AIContextItem } from '@khulnasoft/ai-context';
import { SecretRedactor } from '../../secret_redaction';
import { ConfigService } from '../../config_service';
import { AiContextTransformer } from '.';

export interface SecretContextTransformer extends AiContextTransformer {}

@Injectable(AiContextTransformer, [Logger, ConfigService, SecretRedactor])
export class DefaultSecretContextTransformer implements SecretContextTransformer {
  #logger: Logger;

  #configService: ConfigService;

  #secretRedactor: SecretRedactor;

  constructor(logger: Logger, configService: ConfigService, secretRedactor: SecretRedactor) {
    this.#secretRedactor = secretRedactor;
    this.#configService = configService;
    this.#logger = withPrefix(logger, '[SecretContextTransformer]');
  }

  async transform(context: AIContextItem): Promise<AIContextItem> {
    if (!context.content) {
      return context;
    }

    if (!this.#configService.get('client.codeCompletion.enableSecretRedaction')) {
      this.#logger.debug('Secret redaction disabled, skipping transformation');
      return context;
    }

    this.#logger.debug(`Transforming context item "${context.id}"`);
    const redactedContent = this.#secretRedactor.redactSecrets(context.content, context.id);

    return {
      ...context,
      content: redactedContent,
    };
  }
}

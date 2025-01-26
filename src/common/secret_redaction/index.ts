import { createInterfaceId, Injectable } from '@khulnasoft/di';
import type { IDocContext, IDocTransformer } from '../document_transformer_service';
import { ConfigService } from '../config_service';
import { log } from '../log';
import rules, { IGitleaksRule } from './gitleaks_rules';
import { convertToJavaScriptRegex } from './helpers';

export interface SecretRedactor extends DefaultSecretRedactor {}

export const SecretRedactor = createInterfaceId<SecretRedactor>('SecretRedactor');

@Injectable(SecretRedactor, [ConfigService])
export class DefaultSecretRedactor implements IDocTransformer {
  #rules: IGitleaksRule[] = [];

  #configService: ConfigService;

  constructor(configService: ConfigService) {
    this.#rules = rules.map((rule) => ({
      ...rule,
      compiledRegex: new RegExp(convertToJavaScriptRegex(rule.regex), 'gmi'),
    }));

    this.#configService = configService;
  }

  transform(context: IDocContext): IDocContext {
    if (!this.#configService.get('client.codeCompletion.enableSecretRedaction')) {
      return context;
    }

    return {
      prefix: this.redactSecrets(context.prefix, context.uri),
      suffix: this.redactSecrets(context.suffix, context.uri),
      fileRelativePath: context.fileRelativePath,
      position: context.position,
      uri: context.uri,
      languageId: context.languageId,
      workspaceFolder: context.workspaceFolder,
    };
  }

  redactSecrets(raw: string, uri: string): string {
    return this.#rules.reduce((redacted: string, rule: IGitleaksRule) => {
      return this.#redactRuleSecret(redacted, rule, uri);
    }, raw);
  }

  #redactRuleSecret(str: string, rule: IGitleaksRule, uri: string): string {
    if (!rule.compiledRegex) return str;

    if (!this.#keywordHit(rule, str)) {
      return str;
    }

    const matches = [...str.matchAll(rule.compiledRegex)];

    if (this.#configService.get('client.logLevel') === 'debug' && matches.length) {
      log.debug(`redacting secret in ${uri}`);
    }

    return matches.reduce((redacted: string, match: RegExpMatchArray) => {
      const secret = match[rule.secretGroup ?? 0];
      return redacted.replace(secret, '*'.repeat(secret.length));
    }, str);
  }

  #keywordHit(rule: IGitleaksRule, raw: string) {
    if (!rule.keywords?.length) {
      return true;
    }

    for (const keyword of rule.keywords) {
      if (raw.toLowerCase().includes(keyword)) {
        return true;
      }
    }

    return false;
  }
}

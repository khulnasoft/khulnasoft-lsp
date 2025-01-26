import { ConfigService, DefaultConfigService } from '..';
import { SecretRedactor, DefaultSecretRedactor } from '.';

const textWithSecrets = `File with various fake secrets to test redaction with Gitleaks rules.

aws-key=AKIALALEMEL33243OKIA
pypiToken: pypi-AgEIcHlwaS5vcmcAAAAAAAAAA-AAAAAAAAAA-AAAAAAAAAA-AAAAAAAAAA-AAAAAAAAAA-AAAAAAAAAAB
Key = "e7322523fb86ed64c836a979cf8465fbd436378c653c1db38f9ae87bc62a6fd5"
glpat="glpat-deadbeefdeadbeefdead"
`;
const redactedText = `File with various fake secrets to test redaction with Gitleaks rules.

aws-key=********************
pypiToken: **************************************************************************************
Key = "****************************************************************"
glpat="**************************"
`;

describe('Secrets Redaction', () => {
  let redactor: SecretRedactor;
  let configService: ConfigService;

  beforeEach(async () => {
    configService = new DefaultConfigService();
    redactor = new DefaultSecretRedactor(configService);
  });

  describe('redactSecrets', () => {
    it('should redact the secrets from the string', () => {
      const uri = 'file:///index.js';
      expect(redactor.redactSecrets(textWithSecrets, uri)).toBe(redactedText);
    });
  });

  describe('transform', () => {
    const context = {
      prefix: 'aws-key=AKIALALEMEL33243OKIA',
      suffix: 'glpat="glpat-deadbeefdeadbeefdead"',
      fileRelativePath: 'index.js',
      position: {
        line: 0,
        character: 28,
      },
      uri: 'file:///index.js',
      languageId: 'javascript',
    };

    it('should NOT transform the input when secret redaction is disabled', () => {
      configService.set('client.codeCompletion.enableSecretRedaction', false);
      expect(redactor.transform(context)).toEqual(context);
    });

    it('should transform the input when secret redaction is enabled', () => {
      configService.set('client.codeCompletion.enableSecretRedaction', true);
      expect(redactor.transform(context)).toEqual({
        prefix: 'aws-key=********************',
        suffix: 'glpat="**************************"',
        fileRelativePath: 'index.js',
        position: {
          line: 0,
          character: 28,
        },
        uri: 'file:///index.js',
        languageId: 'javascript',
      });
    });
  });
});

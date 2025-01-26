import { KhulnaSoftAPI } from '../api';
import { AUTHENTICATION, AUTHENTICATION_REQUIRED, INVALID_TOKEN } from '../feature_state';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { DefaultAuthenticationConfigurationValidator } from './authentication_configuration_validator';

describe('AuthenticationConfigurationValidator', () => {
  const baseUrl = 'https://gitlab.com';
  const token = 'glpat-1234566';

  const mockCheckToken = jest.fn();
  const api = createFakePartial<KhulnaSoftAPI>({
    checkToken: mockCheckToken,
  });

  const validator = new DefaultAuthenticationConfigurationValidator(api);

  it('should engage AUTHENTICATION_REQUIRED check when baseUrl is missing', async () => {
    const result = await validator.validate({ baseUrl: '', token });

    expect(result?.featureId).toEqual(AUTHENTICATION);
    expect(result?.engagedChecks).toHaveLength(1);
    expect(result?.engagedChecks[0]).toEqual({
      checkId: AUTHENTICATION_REQUIRED,
      details: 'You need to authenticate to use KhulnaSoft Duo.',
      engaged: true,
    });
  });

  it('should engage AUTHENTICATION_REQUIRED check when token is missing', async () => {
    const result = await validator.validate({ baseUrl, token: '' });

    expect(result?.featureId).toEqual(AUTHENTICATION);
    expect(result?.engagedChecks).toHaveLength(1);
    expect(result?.engagedChecks[0]).toEqual({
      checkId: AUTHENTICATION_REQUIRED,
      details: 'You need to authenticate to use KhulnaSoft Duo.',
      engaged: true,
    });
  });

  it('should engage INVALID_TOKEN check when token is invalid', async () => {
    const errorMessage = 'Invalid token';
    mockCheckToken.mockResolvedValue({ valid: false, message: errorMessage });

    const result = await validator.validate({ baseUrl, token });

    expect(result?.featureId).toEqual(AUTHENTICATION);
    expect(result?.engagedChecks).toHaveLength(1);
    expect(result?.engagedChecks[0]).toEqual({
      checkId: INVALID_TOKEN,
      details: errorMessage,
      engaged: true,
    });
  });

  it('should have no engaged check when token is valid', async () => {
    mockCheckToken.mockResolvedValue({ valid: true });

    const result = await validator.validate({ baseUrl, token });

    expect(result?.featureId).toEqual(AUTHENTICATION);
    expect(result?.engagedChecks).toHaveLength(0);
  });
});

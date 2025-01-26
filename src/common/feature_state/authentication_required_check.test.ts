import { Disposable } from 'vscode-languageserver-protocol';
import { ApiReconfiguredData } from '@khulnasoft/core';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { KhulnaSoftApiClient } from '../api';
import { DefaultAuthenticationRequiredCheck } from './authentication_required_check';
import { AUTHENTICATION_REQUIRED } from './feature_state_management_types';

describe('AuthenticationRequiredCheck', () => {
  const disposables: Disposable[] = [];

  let listeners: Array<(data: ApiReconfiguredData) => void> = [];

  let check: DefaultAuthenticationRequiredCheck;
  let mockApi: KhulnaSoftApiClient;

  const checkEngagedChangeListener = jest.fn();

  beforeEach(() => {
    mockApi = createFakePartial<KhulnaSoftApiClient>({
      fetchFromApi: jest.fn(),
      onApiReconfigured: jest.fn((listener) => {
        listeners.push(listener);
        return { dispose: () => {} };
      }),
    });

    check = new DefaultAuthenticationRequiredCheck(mockApi);
    disposables.push(check.onChanged(checkEngagedChangeListener));
  });

  afterEach(() => {
    listeners = [];

    while (disposables.length > 0) {
      disposables.pop()!.dispose();
    }
  });

  const reconfigureApi = async (
    data: ApiReconfiguredData = createFakePartial<ApiReconfiguredData>({ isInValidState: true }),
  ) => {
    listeners.forEach((listener) => listener(data));

    await new Promise(process.nextTick);
  };

  it('should be engaged when api is in invalid state', async () => {
    await reconfigureApi({ isInValidState: false, validationMessage: '' });

    expect(check.id).toBe(AUTHENTICATION_REQUIRED);
    expect(check.engaged).toBeTruthy();
  });

  it('should not be engaged when api is in valid state', async () => {
    // reconfigureApi always puts the api in a valid state by default.
    await reconfigureApi();

    expect(check.id).toBe(AUTHENTICATION_REQUIRED);
    expect(check.engaged).toBeFalsy();
  });
});

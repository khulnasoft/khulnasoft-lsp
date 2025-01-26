import { Disposable } from 'vscode-languageserver-protocol';
import { ApiReconfiguredData } from '@khulnasoft/core';
import { KhulnaSoftApiClient } from '../../api';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { DefaultTokenCheckNotifier, TokenCheckNotifier } from './token_check_notifier';

describe('TokenCheckNotifier', () => {
  let api: KhulnaSoftApiClient;
  let notifier: TokenCheckNotifier;

  beforeEach(() => {
    api = createFakePartial<KhulnaSoftApiClient>({
      onApiReconfigured: jest.fn(),
    });
  });

  it('registers API reconfigured handler that sends token check notifications', () => {
    let listener;
    const onApiReconfigured = (l: (data: ApiReconfiguredData) => void): Disposable => {
      listener = l;
      return { dispose: jest.fn() };
    };
    api.onApiReconfigured = onApiReconfigured;

    const notify = jest.fn();

    notifier = new DefaultTokenCheckNotifier(api);
    notifier.init(notify);

    listener!({ isInValidState: false, validationMessage: 'error' });

    expect(notify).toHaveBeenCalledWith({ message: 'error' });
  });
});

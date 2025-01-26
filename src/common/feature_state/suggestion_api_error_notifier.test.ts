import {
  DefaultSuggestionApiErrorCheck,
  SuggestionApiErrorCheck,
} from './suggestion_api_error_check';
import {
  DefaultSuggestionApiErrorNotifier,
  SuggestionApiErrorNotifier,
} from './suggestion_api_error_notifier';

describe('SuggestionApiErrorNotifier', () => {
  let apiErrorCheck: SuggestionApiErrorCheck;
  let notifier: SuggestionApiErrorNotifier;
  let errorNotifyFn: jest.Mock;
  let recoveryNotifyFn: jest.Mock;

  beforeEach(() => {
    apiErrorCheck = new DefaultSuggestionApiErrorCheck();
    notifier = new DefaultSuggestionApiErrorNotifier(apiErrorCheck);
    errorNotifyFn = jest.fn().mockResolvedValue(undefined);
    recoveryNotifyFn = jest.fn().mockResolvedValue(undefined);
    notifier.setErrorNotifyFn(errorNotifyFn);
    notifier.setRecoveryNotifyFn(recoveryNotifyFn);
  });

  it('sends error notification', () => {
    apiErrorCheck.error();
    apiErrorCheck.error();
    apiErrorCheck.error();
    apiErrorCheck.error();

    expect(errorNotifyFn).toHaveBeenCalled();
  });

  it('sends recovery notification', () => {
    apiErrorCheck.error();
    apiErrorCheck.error();
    apiErrorCheck.error();
    apiErrorCheck.error();

    apiErrorCheck.success();
    expect(recoveryNotifyFn).toHaveBeenCalled();
  });
});

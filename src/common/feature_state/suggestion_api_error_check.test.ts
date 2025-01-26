import { CIRCUIT_BREAK_INTERVAL_MS } from '../circuit_breaker/circuit_breaker';
import {
  DefaultSuggestionApiErrorCheck,
  SuggestionApiErrorCheck,
} from './suggestion_api_error_check';

jest.useFakeTimers();

describe('SuggestionApiErrorCheck', () => {
  let check: SuggestionApiErrorCheck;
  let onChangeListener: jest.Mock;

  beforeEach(() => {
    check = new DefaultSuggestionApiErrorCheck();
    onChangeListener = jest.fn();
    check.onChanged(onChangeListener);
  });

  it('fires when engaged', () => {
    check.error();
    check.error();
    check.error();
    check.error();

    expect(check.engaged).toBe(true);
    expect(onChangeListener).toHaveBeenCalledWith({
      checkId: check.id,
      details: check.details,
      engaged: true,
    });
  });

  it('fires when disengaged', () => {
    check.error();
    check.error();
    check.error();
    check.error();
    onChangeListener.mockClear();

    check.success();

    expect(check.engaged).toBe(false);
    expect(onChangeListener).toHaveBeenCalledWith({
      checkId: check.id,
      details: check.details,
      engaged: false,
    });
  });

  it('fires after timeout', () => {
    check.error();
    check.error();
    check.error();
    check.error();
    onChangeListener.mockClear();

    jest.advanceTimersByTime(CIRCUIT_BREAK_INTERVAL_MS + 1);

    expect(check.engaged).toBe(false);
    expect(onChangeListener).toHaveBeenCalledWith({
      checkId: check.id,
      details: check.details,
      engaged: false,
    });
  });
});

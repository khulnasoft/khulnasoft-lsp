import { FetchError, isAbortError, isFetchError } from './fetch_error';
import { createFakePartial } from './test_utils/create_fake_partial';

describe('FetchError', () => {
  it('indicates invalid token', () => {
    const error = new FetchError(
      createFakePartial<Response>({
        ok: false,
        url: 'https://example.com/api/v4/project',
        status: 401,
      }),
      'resource name',
      `{ "error": "invalid_token" }`,
    );
    expect(error.isInvalidToken()).toBe(true);
    expect(error.message).toMatch(/token is expired or revoked/);
  });

  it('indicates invalid grant as invalid token', () => {
    const error = new FetchError(
      createFakePartial<Response>({
        ok: false,
        url: 'https://example.com/api/v4/project',
        status: 400,
      }),
      'resource name',
      `{ "error": "invalid_grant" }`,
    );
    expect(error.isInvalidToken()).toBe(true);
    expect(error.message).toMatch(/Request to refresh token failed/);
  });
});

describe('isFetchError', () => {
  it('should return `true` if passed object is a `FetchError` instance', () => {
    const error = new FetchError(
      createFakePartial<Response>({
        ok: false,
        url: 'https://example.com/api/v4/project',
        status: 400,
      }),
      'resource name',
    );
    expect(isFetchError(error)).toBe(true);
  });

  it.each([new Error('Network error'), null, undefined, { name: 'FetchError' }])(
    'should return `false` if passed object is not a `FetchError` instance',
    (err) => {
      expect(isFetchError(err)).toBe(false);
    },
  );
});

describe('isAbortError', () => {
  it('should return `true` if passed object is an abort error', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';

    expect(isAbortError(error)).toBe(true);
  });

  it.each([new Error('Network error'), null, undefined, { name: 'FetchError' }])(
    'should return `false` if passed object is not an abort error',
    (err) => {
      expect(isAbortError(err)).toBe(false);
    },
  );
});

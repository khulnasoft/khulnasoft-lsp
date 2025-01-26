import http from 'http';
import https from 'https';
import fs from 'fs';
import { ProxyAgent } from 'proxy-agent';
import fetch from 'cross-fetch';
import { mockAbortSignalTimeout } from '../common/test_utils/abort_signal_timeout_mock';
import { createFakePartial } from '../common/test_utils/create_fake_partial';
import { log } from '../common/log';
import { Fetch } from './fetch';

jest.useFakeTimers();
jest.mock('cross-fetch');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}));

const { setupAbortSignalTimeoutMock, teardownAbortSignalTimeoutMock } = mockAbortSignalTimeout();

const fakeBuffer = createFakePartial<Buffer>({});
const logErrorSpy = jest.spyOn(log, 'error');

describe('LsFetch', () => {
  const { env } = process;

  beforeEach(() => {
    jest.mocked(fs.readFileSync).mockImplementation(() => fakeBuffer);
    process.env = {
      ...env,
      http_proxy: undefined,
      https_proxy: undefined,
    };
  });

  afterEach(() => {
    process.env = env;
  });

  describe('fetch', () => {
    describe('not initialized', () => {
      it('should throw Error', async () => {
        const lsFetch = new Fetch();

        await expect(lsFetch.fetch('https://gitlab.com/')).rejects.toThrowError(
          'LsFetch not initialized. Make sure LsFetch.initialize() was called.',
        );
      });
    });

    describe('request Methods', () => {
      const testCases: ['get' | 'post' | 'put' | 'delete', string, number][] = [
        ['get', 'GET', 200],
        ['post', 'POST', 500],
        ['put', 'PUT', 404],
        ['delete', 'DELETE', 403],
      ];

      test.each(testCases)(
        'should call cross-fetch fetch for %s',
        async (method, expectedMethod, expectedStatusCode) => {
          const lsFetch = new Fetch();
          await lsFetch.initialize();

          const response = { status: expectedStatusCode, json: jest.fn().mockResolvedValue({}) };
          (fetch as jest.Mock).mockResolvedValueOnce(response);

          await lsFetch[method]('https://gitlab.com/');
          expect(fetch).toHaveBeenCalled();

          const [url, init] = (fetch as jest.Mock).mock.calls[0];
          expect(init.method).toBe(expectedMethod);
          expect(url).toBe('https://gitlab.com/');
        },
      );
    });

    describe('agents', () => {
      let subject: Fetch;

      describe.each`
        expected         | expectedAgent  | expectedUrl             | http_proxy                    | https_proxy
        ${'ProxyAgent'}  | ${ProxyAgent}  | ${'http://gdk.local'}   | ${'http://proxy.local:8080/'} | ${'https://proxy.local:8443/'}
        ${'ProxyAgent'}  | ${ProxyAgent}  | ${'https://github.com'} | ${'http://proxy.local:8080/'} | ${'https://proxy.local:8443/'}
        ${'http.Agent'}  | ${http.Agent}  | ${'http://gdk.local'}   | ${''}                         | ${''}
        ${'https.Agent'} | ${https.Agent} | ${'https://github.com'} | ${''}                         | ${''}
      `('$expected', ({ expectedAgent, expectedUrl, http_proxy, https_proxy }) => {
        beforeEach(async () => {
          process.env = {
            ...env,
            http_proxy,
            https_proxy,
          };

          subject = new Fetch();
          await subject.initialize();

          (fetch as jest.Mock).mockResolvedValue({
            status: 200,
            json: jest.fn().mockResolvedValue({}),
          });
        });

        it(`should fetch ${expectedUrl} given proxy settings`, async () => {
          await subject.get(expectedUrl);
          expect(fetch).toHaveBeenCalled();

          const [url, init] = (fetch as jest.Mock).mock.calls[0];
          expect(init.agent).toBeInstanceOf(expectedAgent);
          expect(init.agent).toEqual(
            expect.objectContaining({
              options: expect.objectContaining({}),
            }),
          );
          expect(url).toBe(expectedUrl);
        });

        if (expectedUrl.startsWith('https:')) {
          it(`should include https related agent options`, async () => {
            await subject.get(expectedUrl);

            expect(fetch).toHaveBeenNthCalledWith(
              1,
              expectedUrl,
              expect.objectContaining({
                agent: expect.objectContaining({
                  options: expect.objectContaining({
                    rejectUnauthorized: true,
                  }),
                }),
              }),
            );
          });

          it(`should support updating https related agent options`, async () => {
            await subject.get(expectedUrl);

            expect(fetch).toHaveBeenNthCalledWith(
              1,
              expectedUrl,
              expect.objectContaining({
                agent: expect.objectContaining({
                  options: expect.objectContaining({
                    rejectUnauthorized: true,
                  }),
                }),
              }),
            );

            await subject.updateAgentOptions({
              ignoreCertificateErrors: true,
              ca: 'abc',
              cert: 'def',
              certKey: 'ghi',
            });
            await subject.get(expectedUrl);

            expect(fetch).toHaveBeenNthCalledWith(
              2,
              expectedUrl,
              expect.objectContaining({
                agent: expect.objectContaining({
                  options: expect.objectContaining({
                    rejectUnauthorized: false,
                    ca: fakeBuffer,
                    cert: fakeBuffer,
                    key: fakeBuffer,
                  }),
                }),
              }),
            );
          });

          it(`should not pass through unset agent options`, async () => {
            await subject.updateAgentOptions({
              ignoreCertificateErrors: false,
              ca: '',
              cert: undefined,
              // certKey not present
            });
            await subject.get(expectedUrl);

            const { options } = (fetch as jest.Mock).mock.calls[0][1].agent;
            expect(options).toEqual(expect.objectContaining({ rejectUnauthorized: true }));
            expect(options).toEqual(expect.not.objectContaining({ ca: expect.anything() }));
            expect(options).toEqual(expect.not.objectContaining({ cert: expect.anything() }));
            expect(options).toEqual(expect.not.objectContaining({ key: expect.anything() }));
          });
        }
      });
    });

    describe('certificate options', () => {
      const expectedUrl = 'https://github.com';
      const error = new Error('hello');
      let subject: Fetch;

      beforeEach(async () => {
        subject = new Fetch();
        await subject.initialize();
        jest.mocked(fs.readFileSync).mockImplementation(() => {
          throw error;
        });
      });

      it.each([['ca'], ['cert'], ['certKey']])(
        "should log an error when file access to '%s' is not possible",
        async (property) => {
          await subject.updateAgentOptions({
            ignoreCertificateErrors: false,
            [property]: 'abc',
          });
          await subject.get(expectedUrl);

          expect(logErrorSpy).toHaveBeenCalledWith(
            'Error reading https agent options from file',
            error,
          );
        },
      );

      it('should NOT log an error when no file access error has occured', async () => {
        await subject.updateAgentOptions({
          ignoreCertificateErrors: false,
        });
        await subject.get(expectedUrl);

        expect(logErrorSpy).not.toHaveBeenCalledWith(
          'Error reading https agent options from file',
          error,
        );
      });
    });

    describe('abort signal handling', () => {
      let lsFetch: Fetch;

      beforeEach(async () => {
        setupAbortSignalTimeoutMock();
        lsFetch = new Fetch();
        await lsFetch.initialize();
      });

      afterEach(teardownAbortSignalTimeoutMock);

      it('should accept an external abort signal and throw AbortError when aborted', async () => {
        const mockResponse = createFakePartial<Response>({
          status: 200,
          json: jest.fn().mockResolvedValue({}),
        });
        jest.mocked(fetch).mockImplementation(
          (_url, options) =>
            new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => resolve(mockResponse), 1000);

              // Handle abort signal
              options?.signal?.addEventListener(
                'abort',
                () => {
                  clearTimeout(timeoutId);
                  const error = new Error('The operation was aborted');
                  error.name = 'TimeoutError';
                  reject(error);
                },
                { once: true },
              );
            }),
        );

        const controller = new AbortController();
        const fetchPromise = lsFetch.get('https://gitlab.com/', { signal: controller.signal });

        // Abort the request
        controller.abort();

        await expect(fetchPromise).rejects.toThrow('The operation was aborted');
        expect(fetch).toHaveBeenCalledWith(
          'https://gitlab.com/',
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          }),
        );
      });

      describe('request timeouts', () => {
        beforeEach(() => {
          // Unresolved promise to simulate long-running request
          jest.mocked(fetch).mockImplementation(
            (_url, options) =>
              new Promise((_resolve, reject) => {
                // Unresolved response to simulate long-running network request

                // Handle abort signal
                options?.signal?.addEventListener(
                  'abort',
                  () => {
                    const error = new Error('The operation was aborted');
                    error.name = 'AbortError';
                    reject(error);
                  },
                  { once: true },
                );
              }),
          );
        });

        describe('when provided with an external abort signal', () => {
          it('should throw TimeoutError when request times out', async () => {
            const controller = new AbortController();

            const fetchPromise = lsFetch.get('https://gitlab.com/', { signal: controller.signal });

            // controller is never aborted
            jest.runAllTimers();

            await expect(fetchPromise).rejects.toThrow(
              'Request to https://gitlab.com/ timed out after 15 seconds',
            );
          });
        });

        describe('when no external abort signal is provided', () => {
          it('should throw TimeoutError when request times out', async () => {
            const fetchPromise = lsFetch.get('https://gitlab.com/');
            jest.runAllTimers();

            await expect(fetchPromise).rejects.toThrow(
              'Request to https://gitlab.com/ timed out after 15 seconds',
            );
          });
        });
      });
    });
  });

  describe('streamFetch', () => {
    let subject: Fetch;
    const mockCancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(),
    };

    beforeEach(async () => {
      subject = new Fetch();
      await subject.initialize();
    });

    it('yields decoded chunks from the response body', async () => {
      const mockResponse = createFakePartial<Response>({
        body: {
          // @ts-expect-error: [Symbol.asyncIterator] is not a valid property for ReadableStream
          async *[Symbol.asyncIterator]() {
            yield Buffer.from('never gonna give you up');
            yield Buffer.from('never gonna let you down');
          },
        },
      });

      const generator = subject.streamResponse(mockResponse, mockCancellationToken);

      expect((await generator.next()).value).toBe('never gonna give you up');
      expect((await generator.next()).value).toBe('never gonna let you down');
      expect((await generator.next()).done).toBe(true);
    });

    it('stops streaming when cancellation is requested', async () => {
      const mockDestroy = jest.fn();
      const mockResponse = createFakePartial<Response>({
        body: {
          // @ts-expect-error: [Symbol.asyncIterator] is not a valid property for ReadableStream
          async *[Symbol.asyncIterator]() {
            yield Buffer.from('never gonna tell a lie');
            // Should not yield this chunk due to cancellation
            yield Buffer.from('and hurt you');
          },
          destroy: mockDestroy,
        },
      });

      const cancellationToken = {
        isCancellationRequested: true,
        onCancellationRequested: jest.fn(),
      };
      const generator = subject.streamResponse(mockResponse, cancellationToken);

      const result = await generator.next();
      expect(result.done).toBe(true);
      expect(mockDestroy).toHaveBeenCalled();
    });

    it('handles empty response body', async () => {
      const mockResponse = createFakePartial<Response>({
        body: null,
      });

      const generator = subject.streamResponse(mockResponse, mockCancellationToken);
      const result = await generator.next();
      expect(result.done).toBe(true);
    });

    it('decodes chunks using TextDecoder', async () => {
      const mockResponse = createFakePartial<Response>({
        body: {
          // @ts-expect-error: [Symbol.asyncIterator] is not a valid property for ReadableStream
          async *[Symbol.asyncIterator]() {
            yield Buffer.from('Hello 👋');
          },
        },
      });

      const generator = subject.streamResponse(mockResponse, mockCancellationToken);
      const result = await generator.next();
      expect(result.value).toBe('Hello 👋');
    });
  });
});

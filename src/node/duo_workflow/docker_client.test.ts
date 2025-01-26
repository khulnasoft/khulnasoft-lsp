import http from 'http';
import { DockerClient } from './docker_client';
import { TimeoutError } from './timeout_error';

jest.mock('http');

describe('DockerClient', () => {
  let dockerClient: DockerClient;
  const dockerSocket = '/example/var/run/docker.sock';

  beforeEach(() => {
    dockerClient = new DockerClient(dockerSocket);
  });

  const mockHttpRequest = (
    responseData: string = '',
    errorMessage: string = '',
    timeout: number = 0,
  ) => {
    const mockRequest = {
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'error' && errorMessage) {
          callback(new Error(errorMessage));
        }
      }),
    };

    (http.request as jest.Mock).mockImplementation((_options, callback) => {
      const mockIncomingMessage = {
        setEncoding: jest.fn(),
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'data' && responseData) {
            handler(JSON.stringify(responseData));
          }
          if (event === 'end' && responseData) {
            handler();
          }
          if (event === 'timeout' && timeout) {
            handler();
          }
        }),
        statusCode: errorMessage ? 500 : 200,
      };
      callback(mockIncomingMessage);
      return mockRequest;
    });

    return mockRequest;
  };

  describe('makeRequest', () => {
    it('should make a request with the correct parameters', async () => {
      const mockRequest = mockHttpRequest('{ "success": true }');
      const apiPath = '/test';
      const method = 'GET';
      const contentType = 'text/plain';
      const data = 'some data';

      await dockerClient.makeRequest(apiPath, method, data, contentType, 1000);

      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          socketPath: dockerSocket,
          path: apiPath,
          method,
          timeout: 1000,
          headers: expect.objectContaining({
            'Content-Type': contentType,
            'Content-Length': data.length,
          }),
        }),
        expect.any(Function),
      );
      expect(mockRequest.write).toHaveBeenCalledWith(data);
      expect(mockRequest.end).toHaveBeenCalled();
    });

    it('should handle errors in makeRequest', async () => {
      const errorMessage = 'Request failed';
      mockHttpRequest('', errorMessage);

      await expect(dockerClient.makeRequest('/test', 'GET', '')).rejects.toThrow(errorMessage);
    });

    it('shoould throw when receiving a timeout event', async () => {
      mockHttpRequest('', '', 500);

      await expect(dockerClient.makeRequest('/test', 'GET', '')).rejects.toThrow(
        expect.any(TimeoutError),
      );
    });
  });
});

import http from 'http';
import { TimeoutError } from './timeout_error';

export class DockerClient {
  #dockerSocket: string;

  constructor(dockerSocket: string) {
    this.#dockerSocket = dockerSocket;
  }

  makeRequest(
    apiPath: string,
    method: string,
    data: string | Buffer,
    contentType = 'application/json',
    timeout: number = 5000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        socketPath: this.#dockerSocket,
        path: apiPath,
        method,
        timeout,
        headers: {
          'Content-Type': contentType,
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const callback = (res: http.IncomingMessage) => {
        res.setEncoding('utf-8');
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            resolve(responseData);
          } else {
            reject(new Error(`Docker error calling ${apiPath} with ${res.statusCode}: ${data}`));
          }
        });
        res.on('timeout', () => {
          reject(new TimeoutError());
        });
      };

      const clientRequest = http.request(options, callback);
      clientRequest.on('error', (err) => {
        reject(err);
      });
      if (data) {
        clientRequest.write(data);
      }
      clientRequest.end();
    });
  }
}

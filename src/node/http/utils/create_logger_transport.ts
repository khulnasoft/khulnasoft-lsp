import { Writable } from 'stream';
import { Logger, LogMethod } from '@khulnasoft/logging';

export const createLoggerTransport = (logger: Logger, level: LogMethod = 'debug') =>
  new Writable({
    objectMode: true,
    write(chunk, _encoding, callback) {
      logger[level](chunk.toString());
      callback();
    },
  });

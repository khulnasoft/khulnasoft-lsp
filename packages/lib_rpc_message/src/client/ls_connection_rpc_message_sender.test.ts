import { Connection } from 'vscode-languageserver';
import { z } from 'zod';
import { RpcMessageDefinition } from '../types';
import { LsConnectionRpcMessageSender } from './ls_connection_rpc_message_sender';
import { RpcValidationError } from './errors';

describe('LsConnectionRpcMessageSender', () => {
  let connection: jest.Mocked<Connection>;
  let sender: LsConnectionRpcMessageSender;

  beforeEach(() => {
    connection = {
      sendNotification: jest.fn(),
      sendRequest: jest.fn(),
    } as unknown as jest.Mocked<Connection>;

    sender = new LsConnectionRpcMessageSender(connection);
  });

  describe('send', () => {
    it('should send a valid notification message', async () => {
      const message: RpcMessageDefinition<{ key: string }, void> = {
        type: 'notification',
        methodName: 'test/notification',
        paramsSchema: z.object({ key: z.string() }),
      };

      await sender.send(message, { key: 'value' });

      expect(connection.sendNotification).toHaveBeenCalledWith('test/notification', {
        key: 'value',
      });
    });

    it('should throw RpcValidationError for invalid notification params', async () => {
      const message: RpcMessageDefinition<{ key: string }, void> = {
        type: 'notification',
        methodName: 'test/notification',
        paramsSchema: z.object({ key: z.string() }),
      };

      await expect(sender.send(message, { key: 123 } as never)).rejects.toThrow(RpcValidationError);
    });

    it('should send a valid request and return the parsed response', async () => {
      const message: RpcMessageDefinition<{ id: number }, { name: string }> = {
        type: 'request',
        methodName: 'test/request',
        paramsSchema: z.object({ id: z.number() }),
        responseSchema: z.object({ name: z.string() }),
      };

      connection.sendRequest.mockResolvedValue({ name: 'Alice' });

      const result = await sender.send(message, { id: 1 });

      expect(result).toEqual({ name: 'Alice' });
      expect(connection.sendRequest).toHaveBeenCalledWith('test/request', { id: 1 });
    });

    it('should throw RpcValidationError for invalid request params', async () => {
      const message: RpcMessageDefinition<{ id: number }, { name: string }> = {
        type: 'request',
        methodName: 'test/request',
        paramsSchema: z.object({ id: z.number() }),
        responseSchema: z.object({ name: z.string() }),
      };

      await expect(sender.send(message, { id: 'not-a-number' } as never)).rejects.toThrow(
        RpcValidationError,
      );
    });

    it('should throw RpcValidationError for invalid request response', async () => {
      const message: RpcMessageDefinition<{ id: number }, { name: string }> = {
        type: 'request',
        methodName: 'test/request',
        paramsSchema: z.object({ id: z.number() }),
        responseSchema: z.object({ name: z.string() }),
      };

      connection.sendRequest.mockResolvedValue({ name: 123 });

      await expect(sender.send(message, { id: 1 })).rejects.toThrow(RpcValidationError);
    });

    it('should throw an error for unknown message types', async () => {
      const message: RpcMessageDefinition<unknown, unknown> = {
        type: 'unknown' as never, // Simulate an invalid type
        methodName: 'test/unknown',
        paramsSchema: z.unknown(),
      };

      await expect(sender.send(message, {})).rejects.toThrow('Unknown message type');
    });

    it('should bubble up errors from the connection layer', async () => {
      const message: RpcMessageDefinition<{ id: number }, { name: string }> = {
        type: 'request',
        methodName: 'test/request',
        paramsSchema: z.object({ id: z.number() }),
        responseSchema: z.object({ name: z.string() }),
      };

      connection.sendRequest.mockRejectedValue(new Error('Connection failure'));

      await expect(sender.send(message, { id: 1 })).rejects.toThrow('Connection failure');
    });
  });
});

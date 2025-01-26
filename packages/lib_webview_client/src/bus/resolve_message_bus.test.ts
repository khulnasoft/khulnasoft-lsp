import { MessageBus, MessageMap } from '@khulnasoft/message-bus';
import { MessageBusProvider } from './provider';
import { resolveMessageBus } from './resolve_message_bus';

describe('resolveMessageBus', () => {
  const webviewId = 'test-webview-id';
  let mockMessageBus: jest.Mocked<MessageBus<MessageMap>>;
  let mockProvider1: jest.Mocked<MessageBusProvider>;
  let mockProvider2: jest.Mocked<MessageBusProvider>;

  beforeEach(() => {
    mockMessageBus = {
      onNotification: jest.fn(),
    } as unknown as jest.Mocked<MessageBus<MessageMap>>;

    mockProvider1 = {
      name: 'mock-provider-1',
      getMessageBus: jest.fn(),
    };

    mockProvider2 = {
      name: 'mock-provider-2',
      getMessageBus: jest.fn(),
    };
  });

  it('should return the bus from the first provider if available', () => {
    // Arrange
    mockProvider1.getMessageBus.mockReturnValue(mockMessageBus);
    mockProvider2.getMessageBus.mockReturnValue(null);

    // Act
    const result = resolveMessageBus({
      webviewId,
      providers: [mockProvider1, mockProvider2],
    });

    // Assert
    expect(result).toBe(mockMessageBus);
    expect(mockProvider1.getMessageBus).toHaveBeenCalledWith(webviewId);
    expect(mockProvider2.getMessageBus).not.toHaveBeenCalled();
  });

  it('should return the bus from the second provider if the first one is not available', () => {
    // Arrange
    mockProvider1.getMessageBus.mockReturnValue(null);
    mockProvider2.getMessageBus.mockReturnValue(mockMessageBus);

    // Act
    const result = resolveMessageBus({
      webviewId,
      providers: [mockProvider1, mockProvider2],
    });

    // Assert
    expect(result).toBe(mockMessageBus);
    expect(mockProvider1.getMessageBus).toHaveBeenCalledWith(webviewId);
    expect(mockProvider2.getMessageBus).toHaveBeenCalledWith(webviewId);
  });

  it('should throw an error if no providers return a bus', () => {
    // Arrange
    mockProvider1.getMessageBus.mockReturnValue(null);
    mockProvider2.getMessageBus.mockReturnValue(null);

    // Act & Assert
    expect(() =>
      resolveMessageBus({
        webviewId,
        providers: [mockProvider1, mockProvider2],
      }),
    ).toThrow(`Unable to resolve a message bus for webviewId: ${webviewId}`);

    expect(mockProvider1.getMessageBus).toHaveBeenCalledWith(webviewId);
    expect(mockProvider2.getMessageBus).toHaveBeenCalledWith(webviewId);
  });
});

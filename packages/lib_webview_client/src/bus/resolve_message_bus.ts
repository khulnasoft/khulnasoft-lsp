import { MessageBus, MessageMap } from '@khulnasoft/message-bus';
import { Logger, NullLogger } from '@khulnasoft/logging';
import { isThemeInfo, THEME_CHANGE_NOTIFICATION_METHOD } from '@khulnasoft/webview-theme';
import { getDefaultProviders, MessageBusProvider } from './provider';

type ResolveMessageBusParams = {
  webviewId: string;
  providers?: MessageBusProvider[];
  logger?: Logger;
};

export function resolveMessageBus<TMessages extends MessageMap>(
  params: ResolveMessageBusParams,
): MessageBus<TMessages> {
  const { webviewId } = params;
  const logger = params.logger || new NullLogger();
  const providers = params.providers || getDefaultProviders();

  for (const provider of providers) {
    const bus = getMessageBusFromProviderSafe<TMessages>(webviewId, provider, logger);
    if (bus) {
      setupThemeChangeListener(bus, logger);
      return bus;
    }
  }

  throw new Error(`Unable to resolve a message bus for webviewId: ${webviewId}`);
}

function getMessageBusFromProviderSafe<TMessages extends MessageMap>(
  webviewId: string,
  provider: MessageBusProvider,
  logger: Logger,
): MessageBus<TMessages> | null {
  try {
    logger.debug(`Trying to resolve message bus from provider: ${provider.name}`);
    const bus = provider.getMessageBus<TMessages>(webviewId);
    logger.debug(`Message bus resolved from provider: ${provider.name}`);
    return bus;
  } catch (error) {
    logger.debug('Failed to resolve message bus', error as Error);

    return null;
  }
}

function setupThemeChangeListener(bus: MessageBus, logger: Logger) {
  bus.onNotification(THEME_CHANGE_NOTIFICATION_METHOD, (theme: unknown) => {
    if (!isThemeInfo(theme)) {
      logger.warn(`Invalid theme format: ${JSON.stringify(theme)}`);
      return;
    }

    Object.entries(theme.styles).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  });
}

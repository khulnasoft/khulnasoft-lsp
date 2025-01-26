import { brandInstance, Container } from '@khulnasoft/di';
import { Logger } from '@khulnasoft/logging';
import { ThemeProvider, ThemePublisher } from '../types';
import { ThemeService } from '../services/theme_service';
import { DefaultThemeNotificationHandler, ThemeNotificationHandler } from '../handlers';

export const addWebviewThemeServicesToContainer = (container: Container, logger: Logger): void => {
  const themeService = new ThemeService();

  container.addInstances(brandInstance(ThemeProvider, themeService));
  container.addInstances(brandInstance(ThemePublisher, themeService));

  container.addInstances(
    brandInstance(
      ThemeNotificationHandler,
      new DefaultThemeNotificationHandler(themeService, logger),
    ),
  );
};

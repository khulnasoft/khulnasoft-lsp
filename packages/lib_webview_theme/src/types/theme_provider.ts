import { createInterfaceId } from '@khulnasoft/di';
import { Disposable } from '@khulnasoft/disposable';
import { ThemeInfo } from './theme';

export interface ThemeSubscriptionListener {
  (theme: ThemeInfo): void;
}

export interface ThemeProvider {
  getTheme(): ThemeInfo;
  onThemeChange(callback: ThemeSubscriptionListener): Disposable;
}
export const ThemeProvider = createInterfaceId<ThemeProvider>('ThemeProvider');

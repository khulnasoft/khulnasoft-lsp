import { createInterfaceId } from '@khulnasoft/di';
import { ThemeInfo } from './theme';

export interface ThemePublisher {
  publishTheme(theme: ThemeInfo): void;
}
export const ThemePublisher = createInterfaceId<ThemePublisher>('ThemePublisher');

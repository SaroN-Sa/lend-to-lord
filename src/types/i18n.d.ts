import type en from '../../messages/en.json';

declare module 'use-intl' {
  interface AppConfig {
    Messages: typeof en;
    Locale: 'en' | 'am';
  }
}

declare global {
  // Augment next-intl for type-safe message keys
  type IntlMessages = typeof en;
}

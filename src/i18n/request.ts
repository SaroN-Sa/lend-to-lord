// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing, isValidLocale } from './routing';

/**
 * Deep-merges source object into target object so missing keys
 * in the secondary language (am) fall back cleanly to English (en).
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const output: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else if (sourceVal !== undefined) {
      output[key] = sourceVal;
    }
  }
  return output as T;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: string | undefined;
  try {
    locale = await requestLocale;
  } catch (error) {
    console.error('[i18n:requestLocale]', error);
  }

  const resolvedLocale =
    locale && isValidLocale(locale) ? locale : routing.defaultLocale;

  try {
    const enMessages = (await import('../../messages/en.json')).default;

    if (resolvedLocale === 'en') {
      return {
        locale: resolvedLocale,
        messages: enMessages,
      };
    }

    // Secondary locale 'am': load am.json and merge on top of en.json base
    try {
      const amMessages = (await import('../../messages/am.json')).default;
      const mergedMessages = deepMerge(enMessages, amMessages);
      return {
        locale: resolvedLocale,
        messages: mergedMessages,
      };
    } catch (amError) {
      console.error('[i18n:loadAmharicMessages]', amError);
      return {
        locale: resolvedLocale,
        messages: enMessages,
      };
    }
  } catch (error) {
    console.error('[i18n:requestConfig]', error);
    throw error;
  }
});

import { describe, it, expect } from 'vitest';
import { routing, isValidLocale } from '@/i18n/routing';
import { deepMerge } from '@/i18n/request';

describe('i18n routing configuration', () => {
  it('has en as the default locale', () => {
    expect(routing.defaultLocale).toBe('en');
  });

  it('supports en and am locales', () => {
    expect(routing.locales).toEqual(['en', 'am']);
  });

  it('disables automatic browser locale detection for deterministic CI', () => {
    expect(routing.localeDetection).toBe(false);
  });

  it('enforces always prefix for deterministic routing', () => {
    expect(routing.localePrefix).toBe('always');
  });
});

describe('isValidLocale type guard', () => {
  it('returns true for supported locales', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('am')).toBe(true);
  });

  it('returns false for unsupported or malformed locales', () => {
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale('es')).toBe(false);
    expect(isValidLocale('EN')).toBe(false);
    expect(isValidLocale('am-ET')).toBe(false);
    expect(isValidLocale('')).toBe(false);
    expect(isValidLocale('null')).toBe(false);
    expect(isValidLocale('undefined')).toBe(false);
  });
});

describe('English fallback runtime deep-merging', () => {
  it('merges secondary language over English base, keeping missing keys as English fallback', () => {
    const enBase = {
      Nav: {
        home: 'Home',
        contribute: 'Contribute',
        admin: 'Admin',
      },
      content: {
        vision: 'Empowering communities through transparent giving.',
      },
      Common: {
        siteTitle: 'Lend To Lord',
      },
    };

    // Simulated am.json missing content.vision and Nav.admin
    const amPartial = {
      Nav: {
        home: 'መነሻ',
        contribute: 'አስተዋጽኦ',
      },
      Common: {
        siteTitle: 'ለጌታ ማበደር',
      },
    };

    const merged = deepMerge(enBase, amPartial);

    // Amharic overrides
    expect(merged.Nav.home).toBe('መነሻ');
    expect(merged.Nav.contribute).toBe('አስተዋጽኦ');
    expect(merged.Common.siteTitle).toBe('ለጌታ ማበደር');

    // English fallbacks for missing keys
    expect(merged.Nav.admin).toBe('Admin');
    expect(merged.content.vision).toBe(
      'Empowering communities through transparent giving.'
    );
  });

  it('handles empty source dictionary by returning complete base dictionary', () => {
    const enBase = { hello: 'world' };
    const amEmpty = {};
    const merged = deepMerge(enBase, amEmpty);
    expect(merged).toEqual({ hello: 'world' });
  });
});

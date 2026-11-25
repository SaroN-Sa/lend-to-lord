import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getHeroData, parseHeroRow } from '@/lib/hero';
import { buildHeroImageUrl, resolveHeroAltText } from '@/lib/hero-schema';

const TEST_SUPABASE_URL = 'https://testproject.supabase.co';

describe('Task 8: Public Hero Data, URL Builder, Alt Text, and Scrim Contrast', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('1. getHeroData / parseHeroRow (states & validation)', () => {
    it('returns "image" state for a valid row', async () => {
      const state = await getHeroData('en', {
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => ({
          image_path: 'hero/banner-123.webp',
          image_width: 1600,
          image_height: 900,
          alt_en: 'Community gathering',
          alt_am: 'የማህበረሰብ ስብሰባ',
        }),
      });

      expect(state).toEqual({
        status: 'image',
        src: 'https://testproject.supabase.co/storage/v1/object/public/site-media/hero/banner-123.webp',
        width: 1600,
        height: 900,
        alt: 'Community gathering',
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns "none" state ONLY when row exists and image_path + dimensions are null', async () => {
      const state = await getHeroData('en', {
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => ({
          image_path: null,
          image_width: null,
          image_height: null,
          alt_en: '',
          alt_am: null,
        }),
      });

      expect(state).toEqual({ status: 'none' });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns "error" and logs [hero:missing-row] when no row (null) is returned', async () => {
      const state = await getHeroData('en', {
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => null,
      });

      expect(state).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[hero:/),
        expect.anything()
      );
    });

    it('returns "error" for wrong path prefix', () => {
      const state = parseHeroRow(
        {
          image_path: 'sponsors/logo.webp',
          image_width: 800,
          image_height: 600,
          alt_en: 'Logo',
          alt_am: null,
        },
        'en',
        TEST_SUPABASE_URL
      );

      expect(state).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[hero:/),
        expect.anything()
      );
    });

    it('returns "error" for path containing ..', () => {
      const state = parseHeroRow(
        {
          image_path: 'hero/../secret.webp',
          image_width: 800,
          image_height: 600,
          alt_en: 'Hero',
          alt_am: null,
        },
        'en',
        TEST_SUPABASE_URL
      );

      expect(state).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[hero:/),
        expect.anything()
      );
    });

    it('returns "error" for width/height <= 0, > 4000, or mismatched pair', () => {
      const zeroWidth = parseHeroRow(
        {
          image_path: 'hero/a.webp',
          image_width: 0,
          image_height: 900,
          alt_en: 'Alt',
          alt_am: null,
        },
        'en',
        TEST_SUPABASE_URL
      );
      expect(zeroWidth).toEqual({ status: 'error' });

      const oversized = parseHeroRow(
        {
          image_path: 'hero/a.webp',
          image_width: 4001,
          image_height: 900,
          alt_en: 'Alt',
          alt_am: null,
        },
        'en',
        TEST_SUPABASE_URL
      );
      expect(oversized).toEqual({ status: 'error' });

      const mismatchedPair = parseHeroRow(
        {
          image_path: 'hero/a.webp',
          image_width: 1600,
          image_height: null,
          alt_en: 'Alt',
          alt_am: null,
        },
        'en',
        TEST_SUPABASE_URL
      );
      expect(mismatchedPair).toEqual({ status: 'error' });

      const orphanDimension = parseHeroRow(
        {
          image_path: null,
          image_width: 1600,
          image_height: null,
          alt_en: '',
          alt_am: null,
        },
        'en',
        TEST_SUPABASE_URL
      );
      expect(orphanDimension).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
    });

    it('returns "error" for non-string alt text', () => {
      const state = parseHeroRow(
        {
          image_path: 'hero/a.webp',
          image_width: 1600,
          image_height: 900,
          alt_en: 12345,
          alt_am: null,
        },
        'en',
        TEST_SUPABASE_URL
      );

      expect(state).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[hero:/),
        expect.anything()
      );
    });

    it('returns "error" and logs [hero:fetch] when fetcher throws', async () => {
      const state = await getHeroData('en', {
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => {
          throw new Error('Connection refused');
        },
      });

      expect(state).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[hero:fetch]',
        expect.any(Error)
      );
    });
  });

  describe('2. Alt-text selector (resolveHeroAltText)', () => {
    it('uses trimmed alt_am on /am when non-empty', () => {
      expect(resolveHeroAltText('am', 'English Alt', '  የአማርኛ ጽሑፍ  ')).toBe(
        'የአማርኛ ጽሑፍ'
      );
    });

    it('falls back to trimmed alt_en on /am when alt_am is empty or whitespace', () => {
      expect(resolveHeroAltText('am', '  English Alt  ', '   ')).toBe('English Alt');
      expect(resolveHeroAltText('am', 'English Alt', null)).toBe('English Alt');
    });

    it('uses trimmed alt_en on /en even when alt_am is present', () => {
      expect(resolveHeroAltText('en', '  English Alt  ', 'የአማርኛ ጽሑፍ')).toBe(
        'English Alt'
      );
    });

    it('returns null (invalid) when both alt_en and alt_am are empty/whitespace', () => {
      expect(resolveHeroAltText('en', '   ', '   ')).toBeNull();
      expect(resolveHeroAltText('am', '', null)).toBeNull();
    });
  });

  describe('3. Image URL builder (buildHeroImageUrl)', () => {
    it('builds the expected public URL for a valid hero/ path', () => {
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, 'hero/photo-1.webp')).toBe(
        'https://testproject.supabase.co/storage/v1/object/public/site-media/hero/photo-1.webp'
      );
    });

    it('rejects invalid paths (.., wrong prefix, empty, leading slash, encoded traversal)', () => {
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, 'hero/../etc/passwd')).toBeNull();
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, 'sponsors/logo.webp')).toBeNull();
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, '')).toBeNull();
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, 'hero/')).toBeNull();
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, '/hero/photo.webp')).toBeNull();
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, 'hero/%2e%2e/secret.webp')).toBeNull();
      expect(buildHeroImageUrl(TEST_SUPABASE_URL, 'hero/%2E%2E/secret.webp')).toBeNull();
      expect(buildHeroImageUrl(undefined, 'hero/photo.webp')).toBeNull();
      expect(
        buildHeroImageUrl('https://placeholder.supabase.co', 'hero/photo.webp')
      ).toBeNull();
    });
  });

  describe('4. Scrim & gradient fallback contrast (>= 4.5:1 in both themes)', () => {
    type RGB = [number, number, number];
    type RGBA = [number, number, number, number];

    function parseHex(hex: string): RGB {
      const clean = hex.replace('#', '').trim();
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
      ];
    }

    function parseColor(value: string): RGBA {
      const trimmed = value.trim();
      if (trimmed.startsWith('#')) {
        const [r, g, b] = parseHex(trimmed);
        return [r, g, b, 1];
      }
      const match = trimmed.match(
        /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
      );
      if (!match) {
        throw new Error(`Unsupported color token format: ${value}`);
      }
      return [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        match[4] !== undefined ? Number(match[4]) : 1,
      ];
    }

    function compositeOver(fg: RGBA, bg: RGB): RGB {
      const a = fg[3];
      return [
        fg[0] * a + bg[0] * (1 - a),
        fg[1] * a + bg[1] * (1 - a),
        fg[2] * a + bg[2] * (1 - a),
      ];
    }

    function getLuminance([r, g, b]: RGB): number {
      const toLinear = (c: number) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    function getContrast(c1: RGB, c2: RGB): number {
      const l1 = getLuminance(c1);
      const l2 = getLuminance(c2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    function extractBlockVar(block: string, varName: string): string {
      const match = block.match(new RegExp(`${varName}:\\s*([^;]+);`));
      if (!match) throw new Error(`Missing ${varName} in CSS block`);
      return match[1].trim();
    }

    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    const lightBlock = css.match(
      /(?:^|\n)\s*:root,\s*\n?\s*\[data-theme="light"\]\s*\{([\s\S]*?)\}/
    )?.[1];
    const darkBlock = css.match(
      /(?:^|\n)\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\}/
    )?.[1];

    it.each([
      ['light', lightBlock],
      ['dark', darkBlock],
    ])('%s theme hero text & muted text pass >= 4.5:1 over scrim on #ffffff, #000000, and gradient stops', (_theme, block) => {
      expect(block).toBeDefined();
      const b = block as string;

      const heroText = parseHex(extractBlockVar(b, '--hero-text'));
      const heroMuted = parseHex(extractBlockVar(b, '--hero-text-muted'));
      const scrim = parseColor(extractBlockVar(b, '--hero-scrim'));
      const gradFrom = parseHex(extractBlockVar(b, '--hero-gradient-from'));
      const gradVia = parseHex(extractBlockVar(b, '--hero-gradient-via'));
      const gradTo = parseHex(extractBlockVar(b, '--hero-gradient-to'));

      const backgrounds: RGB[] = [
        [255, 255, 255], // #ffffff worst-case bright photo
        [0, 0, 0], // #000000 worst-case dark photo
        gradFrom,
        gradVia,
        gradTo,
      ];

      for (const bg of backgrounds) {
        const composited = compositeOver(scrim, bg);
        expect(getContrast(heroText, composited)).toBeGreaterThanOrEqual(4.5);
        expect(getContrast(heroMuted, composited)).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSponsorsData, parseSponsorsRows } from '@/lib/sponsors';
import { MAX_SPONSORS, buildSponsorLogoUrl } from '@/lib/sponsors-schema';
import {
  areControlsNeeded,
  getMarqueeDurationSec,
  getNextIndex,
  getPrevIndex,
  getTrackTranslateX,
} from '@/lib/carousel-logic';

const TEST_SUPABASE_URL = 'https://testproject.supabase.co';

function makeValidSponsor(index: number, overrides: Record<string, unknown> = {}) {
  const hex = index.toString(16).padStart(4, '0');
  return {
    id: `00000000-0000-4000-8000-00000000${hex}`,
    name: `Sponsor ${index}`,
    logo_path: `sponsors/logo-${index}.webp`,
    website_url: `https://sponsor${index}.example.org`,
    sort_order: index,
    ...overrides,
  };
}

describe('Task 9: Sponsors Data, Validation, URL Builder, and Carousel Logic', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('1. getSponsorsData & parseSponsorsRows', () => {
    it('returns "ready" state when all rows are valid', async () => {
      const state = await getSponsorsData({
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => [
          makeValidSponsor(1),
          makeValidSponsor(2, { website_url: null }),
        ],
      });

      expect(state.status).toBe('ready');
      if (state.status === 'ready') {
        expect(state.sponsors).toHaveLength(2);
        expect(state.sponsors[0]).toEqual({
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Sponsor 1',
          logoUrl:
            'https://testproject.supabase.co/storage/v1/object/public/site-media/sponsors/logo-1.webp',
          websiteUrl: 'https://sponsor1.example.org',
          sortOrder: 1,
        });
        expect(state.sponsors[1].websiteUrl).toBeNull();
      }
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('skips invalid rows, logs [sponsors:invalid-row], and keeps valid rows', async () => {
      const state = await getSponsorsData({
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => [
          makeValidSponsor(1),
          makeValidSponsor(2, { logo_path: 'hero/wrong-prefix.webp' }),
          makeValidSponsor(3, { logo_path: 'sponsors/../traversal.webp' }),
          makeValidSponsor(4, { website_url: 'http://insecure.example.org' }),
          makeValidSponsor(5, { website_url: 'javascript:alert(1)' }),
          makeValidSponsor(6, { website_url: 'data:text/html,hi' }),
          makeValidSponsor(7, { website_url: '//protocol-relative.example.org' }),
          makeValidSponsor(8, { website_url: 'https://user:pass@example.org' }),
          makeValidSponsor(9, { name: '   ' }),
          makeValidSponsor(10, { name: 'A'.repeat(121) }),
          makeValidSponsor(11, { sort_order: 1.5 }),
          makeValidSponsor(12),
        ],
      });

      expect(state.status).toBe('ready');
      if (state.status === 'ready') {
        expect(state.sponsors.map((s) => s.name)).toEqual(['Sponsor 1', 'Sponsor 12']);
      }
      expect(consoleErrorSpy).toHaveBeenCalledTimes(10);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[sponsors:invalid-row]',
        expect.anything()
      );
    });

    it('returns "empty" when zero valid sponsors exist', async () => {
      const emptyArrayState = await getSponsorsData({
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => [],
      });
      expect(emptyArrayState).toEqual({ status: 'empty' });
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      const allInvalidState = parseSponsorsRows(
        [makeValidSponsor(1, { name: '' })],
        TEST_SUPABASE_URL
      );
      expect(allInvalidState).toEqual({ status: 'empty' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('returns "error" when result is null', async () => {
      const state = await getSponsorsData({
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => null,
      });

      expect(state).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[sponsors:missing-result]',
        expect.anything()
      );
    });

    it('caps valid rows at 24', async () => {
      const rows = Array.from({ length: 30 }, (_, i) => makeValidSponsor(i + 1));
      const state = await getSponsorsData({
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => rows,
      });

      expect(state.status).toBe('ready');
      if (state.status === 'ready') {
        expect(state.sponsors).toHaveLength(MAX_SPONSORS);
      }
    });

    it('returns "error" and logs [sponsors:fetch] when fetcher throws', async () => {
      const state = await getSponsorsData({
        supabaseUrl: TEST_SUPABASE_URL,
        fetcher: async () => {
          throw new Error('Network failure');
        },
      });

      expect(state).toEqual({ status: 'error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[sponsors:fetch]',
        expect.any(Error)
      );
    });

    it('returns "error" when Supabase URL env is missing or placeholder', async () => {
      const missingState = await getSponsorsData({
        supabaseUrl: undefined,
        fetcher: async () => [makeValidSponsor(1)],
      });
      expect(missingState).toEqual({ status: 'error' });

      const placeholderState = await getSponsorsData({
        supabaseUrl: 'https://placeholder.supabase.co',
        fetcher: async () => [makeValidSponsor(1)],
      });
      expect(placeholderState).toEqual({ status: 'error' });

      expect(buildSponsorLogoUrl(undefined, 'sponsors/a.webp')).toBeNull();
      expect(
        buildSponsorLogoUrl('https://placeholder.supabase.co', 'sponsors/a.webp')
      ).toBeNull();
    });
  });

  describe('2. Carousel pure logic helpers', () => {
    it('wraps getNextIndex cleanly at end and handles invalid/empty lengths', () => {
      expect(getNextIndex(0, 4)).toBe(1);
      expect(getNextIndex(3, 4)).toBe(0);
      expect(getNextIndex(0, 0)).toBe(0);
      expect(getNextIndex(-1, 4)).toBe(1);
    });

    it('wraps getPrevIndex cleanly at start and handles invalid/empty lengths', () => {
      expect(getPrevIndex(0, 4)).toBe(3);
      expect(getPrevIndex(2, 4)).toBe(1);
      expect(getPrevIndex(0, 0)).toBe(0);
      expect(getPrevIndex(10, 4)).toBe(3);
    });

    it('determines controlsNeeded only when more than 1 sponsor exists', () => {
      expect(areControlsNeeded(0)).toBe(false);
      expect(areControlsNeeded(1)).toBe(false);
      expect(areControlsNeeded(2)).toBe(true);
      expect(areControlsNeeded(5)).toBe(true);
      expect(areControlsNeeded(Number.NaN)).toBe(false);
    });

    it('computes deterministic translate3d X offsets', () => {
      expect(getTrackTranslateX(0, 208)).toBe(0);
      expect(getTrackTranslateX(1, 208)).toBe(-208);
      expect(getTrackTranslateX(3, 192)).toBe(-576);
      expect(getTrackTranslateX(-1, 208)).toBe(0);
      expect(getTrackTranslateX(2, 0)).toBe(0);
      expect(getTrackTranslateX(Number.NaN, 208)).toBe(0);
    });

    it('computes calm marquee duration scaled between 25s and 35s', () => {
      expect(getMarqueeDurationSec(1)).toBe(25);
      expect(getMarqueeDurationSec(2)).toBe(25);
      expect(getMarqueeDurationSec(6)).toBe(31);
      expect(getMarqueeDurationSec(24)).toBe(35);
      expect(getMarqueeDurationSec(Number.NaN)).toBe(25);
    });
  });
});

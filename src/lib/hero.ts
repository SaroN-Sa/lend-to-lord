import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import {
  buildHeroImageUrl,
  heroRowSchema,
  resolveHeroAltText,
  supabaseUrlSchema,
} from '@/lib/hero-schema';

export type HeroDataState =
  | {
      status: 'image';
      src: string;
      width: number;
      height: number;
      alt: string;
    }
  | { status: 'none' }
  | { status: 'error' };

export function parseHeroRow(
  row: unknown,
  locale: string,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): HeroDataState {
  if (row === null || row === undefined) {
    console.error('[hero:missing-row]', 'No row returned from public_home_hero');
    return { status: 'error' };
  }

  if (typeof row !== 'object' || Array.isArray(row)) {
    console.error('[hero:invalid-row]', row);
    return { status: 'error' };
  }

  const parsed = heroRowSchema.safeParse(row);
  if (!parsed.success) {
    console.error('[hero:schema-validation]', parsed.error);
    return { status: 'error' };
  }

  const data = parsed.data;
  if (data.image_path === null) {
    return { status: 'none' };
  }

  const alt = resolveHeroAltText(locale, data.alt_en, data.alt_am);
  if (!alt) {
    console.error('[hero:missing-alt]', 'Hero image row has empty alt text');
    return { status: 'error' };
  }

  const src = buildHeroImageUrl(supabaseUrl, data.image_path);
  if (!src) {
    console.error('[hero:invalid-config]', 'Invalid NEXT_PUBLIC_SUPABASE_URL or image_path');
    return { status: 'error' };
  }

  return {
    status: 'image',
    src,
    width: data.image_width as number,
    height: data.image_height as number,
    alt,
  };
}

function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          next: { revalidate: 60, tags: ['home-hero'] },
        });
      },
    },
  });
}

async function fetchHeroFromDb() {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('public_home_hero')
    .select('image_path, image_width, image_height, alt_en, alt_am')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

const getCachedHeroRow = unstable_cache(
  async () => {
    return await fetchHeroFromDb();
  },
  ['public_home_hero_cache'],
  { revalidate: 60, tags: ['home-hero'] }
);

export interface GetHeroDataOptions {
  fetcher?: () => Promise<unknown>;
  supabaseUrl?: string;
}

export async function getHeroData(
  locale: string,
  options?: GetHeroDataOptions
): Promise<HeroDataState> {
  const supabaseUrl = options?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!options?.fetcher) {
    const urlCheck = supabaseUrlSchema.safeParse(supabaseUrl);
    if (!urlCheck.success) {
      console.error('[hero:invalid-config]', 'Missing or invalid NEXT_PUBLIC_SUPABASE_URL');
      return { status: 'error' };
    }
  }

  try {
    const row = options?.fetcher ? await options.fetcher() : await getCachedHeroRow();
    return parseHeroRow(row, locale, supabaseUrl);
  } catch (error) {
    console.error('[hero:fetch]', error);
    return { status: 'error' };
  }
}

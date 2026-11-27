import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { supabaseUrlSchema } from '@/lib/hero-schema';
import {
  MAX_SPONSORS,
  buildSponsorLogoUrl,
  sponsorRowSchema,
} from '@/lib/sponsors-schema';

export interface SponsorItem {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  sortOrder: number;
}

export type SponsorsDataState =
  | { status: 'ready'; sponsors: SponsorItem[] }
  | { status: 'empty' }
  | { status: 'error' };

export function parseSponsorsRows(
  rows: unknown,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): SponsorsDataState {
  const urlCheck = supabaseUrlSchema.safeParse(supabaseUrl);
  if (!urlCheck.success) {
    console.error('[sponsors:invalid-config]', 'Missing or invalid NEXT_PUBLIC_SUPABASE_URL');
    return { status: 'error' };
  }

  if (rows === null || rows === undefined) {
    console.error('[sponsors:missing-result]', 'Null or undefined result from public_sponsors');
    return { status: 'error' };
  }

  if (!Array.isArray(rows)) {
    console.error('[sponsors:invalid-result]', rows);
    return { status: 'error' };
  }

  const validSponsors: SponsorItem[] = [];
  const capped = rows.slice(0, MAX_SPONSORS);

  for (const row of capped) {
    const parsed = sponsorRowSchema.safeParse(row);
    if (!parsed.success) {
      console.error('[sponsors:invalid-row]', parsed.error);
      continue;
    }

    const logoUrl = buildSponsorLogoUrl(supabaseUrl, parsed.data.logo_path);
    if (!logoUrl) {
      console.error('[sponsors:invalid-logo-url]', parsed.data.logo_path);
      continue;
    }

    validSponsors.push({
      id: parsed.data.id,
      name: parsed.data.name,
      logoUrl,
      websiteUrl: parsed.data.website_url,
      sortOrder: parsed.data.sort_order,
    });
  }

  if (validSponsors.length === 0) {
    return { status: 'empty' };
  }

  return { status: 'ready', sponsors: validSponsors };
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
          next: { revalidate: 60, tags: ['sponsors'] },
        });
      },
    },
  });
}

async function fetchSponsorsFromDb() {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('public_sponsors')
    .select('id, name, logo_path, website_url, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(MAX_SPONSORS);

  if (error) {
    throw error;
  }

  return data;
}

const getCachedSponsorsRows = unstable_cache(
  async () => {
    return await fetchSponsorsFromDb();
  },
  ['public_sponsors_cache'],
  { revalidate: 60, tags: ['sponsors'] }
);

export interface GetSponsorsDataOptions {
  fetcher?: () => Promise<unknown>;
  supabaseUrl?: string;
}

export async function getSponsorsData(
  options?: GetSponsorsDataOptions
): Promise<SponsorsDataState> {
  const supabaseUrl = options?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  const urlCheck = supabaseUrlSchema.safeParse(supabaseUrl);
  if (!urlCheck.success) {
    console.error('[sponsors:invalid-config]', 'Missing or invalid NEXT_PUBLIC_SUPABASE_URL');
    return { status: 'error' };
  }

  try {
    const rows = options?.fetcher ? await options.fetcher() : await getCachedSponsorsRows();
    return parseSponsorsRows(rows, supabaseUrl);
  } catch (error) {
    console.error('[sponsors:fetch]', error);
    return { status: 'error' };
  }
}

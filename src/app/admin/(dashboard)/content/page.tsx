import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ContentManager } from './ContentManager';

export const dynamic = 'force-dynamic';

export interface HeroRecord {
  id: number;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  alt_en: string;
  alt_am: string | null;
  publicUrl?: string | null;
}

export interface SponsorRecord {
  id: string;
  name: string;
  logo_path: string;
  website_url: string | null;
  sort_order: number;
  is_active: boolean;
  publicLogoUrl?: string;
  created_at?: string;
}

export default async function AdminContentPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch Hero row (id = 1)
  const { data: heroData } = await supabase
    .from('home_hero')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  let hero: HeroRecord = {
    id: 1,
    image_path: null,
    image_width: null,
    image_height: null,
    alt_en: '',
    alt_am: null,
    publicUrl: null,
  };

  if (heroData) {
    let publicUrl: string | null = null;
    if (heroData.image_path) {
      const { data } = supabase.storage
        .from('site-media')
        .getPublicUrl(heroData.image_path);
      publicUrl = data?.publicUrl || null;
    }

    hero = {
      id: heroData.id,
      image_path: heroData.image_path,
      image_width: heroData.image_width,
      image_height: heroData.image_height,
      alt_en: heroData.alt_en || '',
      alt_am: heroData.alt_am || null,
      publicUrl,
    };
  }

  // Fetch all sponsors (active and inactive) ordered by sort_order, then name
  const { data: sponsorsData } = await supabase
    .from('sponsors')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  const sponsors: SponsorRecord[] = (sponsorsData || []).map((s) => {
    let publicLogoUrl = '';
    if (s.logo_path) {
      const { data } = supabase.storage
        .from('site-media')
        .getPublicUrl(s.logo_path);
      publicLogoUrl = data?.publicUrl || '';
    }
    return {
      id: s.id,
      name: s.name,
      logo_path: s.logo_path,
      website_url: s.website_url,
      sort_order: s.sort_order ?? 0,
      is_active: Boolean(s.is_active),
      publicLogoUrl,
      created_at: s.created_at,
    };
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Link href="/admin" className="hover:text-slate-800">
              Admin
            </Link>
            <span>/</span>
            <span>Content</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Hero & Sponsors Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage the public home page hero image and sponsor listings.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Console
        </Link>
      </div>

      <ContentManager initialHero={hero} initialSponsors={sponsors} />
    </main>
  );
}

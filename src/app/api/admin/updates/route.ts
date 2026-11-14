import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/auth/require-admin';

export async function GET(req: Request) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const ethiopianMonth = searchParams.get('month');

  if (!ethiopianMonth) {
    return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('monthly_updates')
    .select('*')
    .eq('ethiopian_month', ethiopianMonth)
    .maybeSingle();

  return NextResponse.json({ update: data || null });
}

export async function POST(req: Request) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const ethiopianMonth = (body.ethiopian_month || '').trim();
    const titleAm = (body.title_am || '').trim();
    const titleEn = (body.title_en || '').trim();
    const bodyAm = (body.body_am || '').trim();
    const bodyEn = (body.body_en || '').trim();
    const published = Boolean(body.published);

    if (!/^\d{4}-(0[1-9]|1[0-3])$/.test(ethiopianMonth)) {
      return NextResponse.json(
        { error: 'Invalid Ethiopian month format (expected YYYY-MM, e.g. 2019-03)' },
        { status: 400 }
      );
    }

    if (!bodyAm && !bodyEn) {
      return NextResponse.json(
        { error: 'Please write the monthly update in at least one language.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_updates')
      .upsert(
        {
          ethiopian_month: ethiopianMonth,
          title_am: titleAm || null,
          title_en: titleEn || null,
          body_am: bodyAm || null,
          body_en: bodyEn || null,
          published,
        },
        { onConflict: 'ethiopian_month' }
      )
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, update: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
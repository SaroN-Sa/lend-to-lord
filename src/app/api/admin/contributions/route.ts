// src/app/api/admin/contributions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getReceiptSignedUrl, supabaseAdmin } from '@/lib/supabase/admin';
import type { ContributionRecord, ContributionStatus } from '@/lib/validation';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('admin_session')?.value ||
      request.cookies.get('sb-access-token')?.value ||
      request.cookies
        .getAll()
        .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const statusFilter = request.nextUrl.searchParams.get('status') || 'all';
  let query = supabaseAdmin
    .from('contributions')
    .select('*')
    .order('created_at', { ascending: false });

  if (['pending', 'approved', 'rejected'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records = await Promise.all(
    ((data || []) as ContributionRecord[]).map(async (item) => ({
      ...item,
      receipt_url: await getReceiptSignedUrl(item.receipt_path),
    }))
  );

  return NextResponse.json({ records });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; status?: ContributionStatus };
  if (!body.id || !body.status || !['pending', 'approved', 'rejected'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid contribution ID or status' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('contributions')
    .update({ status: body.status })
    .eq('id', body.id)
    .select('id, status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, record: data });
}
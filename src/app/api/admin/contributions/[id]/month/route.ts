import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/auth/require-admin';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const ethiopianMonth = (body.ethiopian_month || '').trim();

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ethiopianMonth)) {
    return NextResponse.json(
      { error: 'Invalid Ethiopian month format. Expected YYYY-MM (01 to 12).' },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from('contributions')
    .update({ ethiopian_month: ethiopianMonth })
    .eq('id', id)
    .select('id, ethiopian_month')
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || 'Contribution not found' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, ethiopian_month: updated.ethiopian_month });
}
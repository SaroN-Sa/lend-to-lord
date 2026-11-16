import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/auth/require-admin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = (body.reason || '').trim();

  if (!reason || reason.length < 3) {
    return NextResponse.json(
      { error: 'Please provide a clear reason (at least 3 characters) for voiding.' },
      { status: 400 }
    );
  }

  // Atomic conditional update: only void if currently 'counted'
  const { data: updated, error } = await supabaseAdmin
    .from('contributions')
    .update({
      status: 'voided',
      void_reason: reason,
      voided_at: new Date().toISOString(),
      voided_by: admin.memberId,
    })
    .eq('id', id)
    .eq('status', 'counted')
    .select('id, status')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json(
      { error: 'Contribution was already voided or does not exist.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, id: updated.id });
}
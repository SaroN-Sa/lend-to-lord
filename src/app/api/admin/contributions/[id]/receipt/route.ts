import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminApi } from '@/lib/auth/require-admin';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const { data: contribution, error } = await supabaseAdmin
    .from('contributions')
    .select('id, screenshot_path')
    .eq('id', id)
    .maybeSingle();

  if (error || !contribution?.screenshot_path) {
    return NextResponse.json(
      { error: 'Receipt screenshot not found for this contribution.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from('screenshots')
    .createSignedUrl(contribution.screenshot_path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signErr?.message || 'Could not generate signed URL.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { url: signed.signedUrl },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  );
}
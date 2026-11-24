// src/app/api/contributions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateContribution } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;

    const input = {
      donor_name: String(formData.get('donor_name') || ''),
      phone: String(formData.get('phone') || ''),
      bank_name: String(formData.get('bank_name') || 'CBE'),
      amount_birr: String(formData.get('amount_birr') || ''),
      reference_no: String(formData.get('reference_no') || ''),
      is_anonymous: formData.get('is_anonymous') === 'true',
      note: String(formData.get('note') || ''),
    };

    const errors = validateContribution(input, file && file.size > 0 ? file : null);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: Object.values(errors)[0], errors },
        { status: 400 }
      );
    }

    let receiptPath: string | null = null;
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeRef = input.reference_no.replace(/[^A-Za-z0-9_-]/g, '');
      receiptPath = `receipts/${Date.now()}-${safeRef}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('screenshots')
        .upload(receiptPath, buffer, { contentType: file.type, upsert: false });

      if (uploadErr) {
        return NextResponse.json(
          { error: `Receipt upload failed: ${uploadErr.message}` },
          { status: 500 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('contributions')
      .insert({
        donor_name: input.donor_name.trim(),
        phone: input.phone.trim() || null,
        bank_name: input.bank_name,
        amount_birr: Number(input.amount_birr),
        reference_no: input.reference_no.trim(),
        is_anonymous: input.is_anonymous,
        note: input.note.trim() || null,
        receipt_path: receiptPath,
        status: 'pending',
      })
      .select('id, reference_no, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, contribution: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request payload' },
      { status: 400 }
    );
  }
}
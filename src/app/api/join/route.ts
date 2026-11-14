import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+251${digits.slice(1)}`;
  }
  if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('7'))) {
    return `+251${digits}`;
  }
  return rawPhone.trim();
}

function generateLinkCode(): string {
  return 'LTL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const locale = body.locale === 'en' ? 'en' : 'am';
    const fullName = (body.full_name || '').trim();
    const rawPhone = (body.phone || '').trim();
    const role = body.role === 'sponsor' ? 'sponsor' : 'partner';
    const language = body.language === 'en' ? 'en' : 'am';
    const showNamePublicly = Boolean(body.show_name_publicly);

    if (!fullName || !rawPhone) {
      return NextResponse.json(
        {
          error:
            locale === 'am'
              ? 'እባክዎ ሙሉ ስም እና ስልክ ቁጥር ያስገቡ።'
              : 'Please enter your full name and phone number.',
        },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);
    const linkCode = generateLinkCode();

    // Check if phone is already registered
    const { data: existing } = await supabaseAdmin
      .from('members')
      .select('id, telegram_chat_id, telegram_link_code')
      .eq('phone', phone)
      .maybeSingle();

    let memberId: string;
    let finalLinkCode = linkCode;

    if (existing) {
      memberId = existing.id;

      // If not yet connected to Telegram, refresh their link code
      if (!existing.telegram_chat_id) {
        await supabaseAdmin
          .from('members')
          .update({
            telegram_link_code: linkCode,
            language,
          })
          .eq('id', existing.id);
      } else {
        // Already connected on Telegram: keep existing state safe, still return a benign code
        finalLinkCode = existing.telegram_link_code || linkCode;
      }
    } else {
      // Create new member row
      const { data: created, error: insertErr } = await supabaseAdmin
        .from('members')
        .insert({
          full_name: fullName,
          phone,
          role,
          language,
          show_name_publicly: showNamePublicly,
          telegram_link_code: linkCode,
          active: true,
        })
        .select('id')
        .single();

      if (insertErr || !created) {
        return NextResponse.json(
          {
            error:
              locale === 'am'
                ? 'ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
                : `Registration failed: ${insertErr?.message || 'Unknown error'}`,
          },
          { status: 500 }
        );
      }

      memberId = created.id;
    }

    // Retroactively link any previous unlinked web contributions with this phone number
    await supabaseAdmin
      .from('contributions')
      .update({ member_id: memberId })
      .is('member_id', null)
      .eq('contributor_phone', phone);

    return NextResponse.json({
      ok: true,
      telegram_link_code: finalLinkCode,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
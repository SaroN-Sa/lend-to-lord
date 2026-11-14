import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { email, password, locale = 'am' } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            locale === 'am'
              ? 'እባክዎ ኢሜይል እና የይለፍ ቃል ያስገቡ።'
              : 'Please enter both email and password.',
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          error:
            locale === 'am'
              ? `የተሳሳተ ኢሜይል ወይም የይለፍ ቃል ነው። (${error?.message || 'Auth failed'})`
              : `Invalid email or password. (${error?.message || 'Auth failed'})`,
        },
        { status: 401 }
      );
    }

    // Verify user is linked to an active admin row in 'members'
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, role, active')
      .eq('auth_user_id', data.user.id)
      .eq('role', 'admin')
      .eq('active', true)
      .maybeSingle();

    if (memberErr) {
      return NextResponse.json(
        { error: `Database check failed: ${memberErr.message}` },
        { status: 500 }
      );
    }

    if (!member) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            locale === 'am'
              ? `ይህ አካውንት በ members ሰንጠረዥ ውስጥ የአስተዳዳሪ (admin) ፈቃድ የለውም። (User ID: ${data.user.id})`
              : `This account is not linked to an active admin row in members. (User ID: ${data.user.id})`,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
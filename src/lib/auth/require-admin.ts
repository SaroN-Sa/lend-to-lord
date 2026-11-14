import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AdminContext {
  authUserId: string;
  email: string;
  memberId: string;
  fullName: string;
}

/**
 * Core verification: validates JWT via supabase.auth.getUser()
 * and checks active admin status in 'members'.
 */
export async function verifyAdmin(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, full_name, role, active')
    .eq('auth_user_id', user.id)
    .eq('role', 'admin')
    .eq('active', true)
    .maybeSingle();

  if (!member) {
    return null;
  }

  return {
    authUserId: user.id,
    email: user.email || '',
    memberId: member.id,
    fullName: member.full_name,
  };
}

/**
 * Use inside Server Components (/admin pages). Redirects to /[locale]/admin/login if unauthorized.
 */
export async function requireAdminPage(locale: string): Promise<AdminContext> {
  const admin = await verifyAdmin();
  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }
  return admin;
}

/**
 * Use inside /api/admin/* Route Handlers. Returns a 401/403 NextResponse if unauthorized.
 */
export async function requireAdminApi(): Promise<
  { admin: AdminContext; errorResponse?: never } | { admin?: never; errorResponse: NextResponse }
> {
  const admin = await verifyAdmin();
  if (!admin) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      ),
    };
  }
  return { admin };
}
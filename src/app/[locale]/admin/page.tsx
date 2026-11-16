import { setRequestLocale } from 'next-intl/server';
import { requireAdminPage } from '@/lib/auth/require-admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getEthiopianDateParts } from '@/lib/ethiopian-calendar';
import AdminDashboardClient, { AdminContributionRow } from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const admin = await requireAdminPage(locale);

  const resolvedSearch = await searchParams;
  const currentMonth = getEthiopianDateParts().monthKey;
  const selectedMonth =
    resolvedSearch.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(resolvedSearch.month)
      ? resolvedSearch.month
      : currentMonth;

  const { data: rows } = await supabaseAdmin
    .from('contributions')
    .select(
      `
      id,
      amount_birr,
      kind,
      method,
      reference_no,
      source,
      ethiopian_month,
      status,
      void_reason,
      voided_at,
      note,
      created_at,
      contributor_name,
      contributor_phone,
      member:members!contributions_member_id_fkey (
        id,
        full_name,
        phone
      )
    `
    )
    .eq('ethiopian_month', selectedMonth)
    .order('created_at', { ascending: false });

  const formattedRows: AdminContributionRow[] = (rows || []).map((r: any) => ({
    ...r,
    member: Array.isArray(r.member) ? r.member[0] || null : r.member || null,
  }));

  return (
    <AdminDashboardClient
      locale={locale}
      adminName={admin.fullName}
      selectedMonth={selectedMonth}
      contributions={formattedRows}
    />
  );
}
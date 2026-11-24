import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/routing';
import { supabaseAdmin } from '@/lib/supabase/admin';
import ContributeForm from './ContributeForm';

export const dynamic = 'force-dynamic';

export default async function ContributePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Fetch active bank and payment accounts for the form dropdowns
  const { data: accounts } = await supabaseAdmin
    .from('public_payment_accounts')
    .select('id, method, account_name, account_number, bank_name, qr_code_url, active')
    .eq('active', true);

  return (
    <main className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#1B4332] dark:text-emerald-400">
          {locale === 'am' ? 'አስተዋጽኦ ማስገባት' : 'Submit Contribution'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-400 max-w-lg mx-auto">
          {locale === 'am'
            ? 'በባንክ ወይም በቴሌብር (Telebirr) ያስተላለፉትን ገንዘብ ደረሰኝ በመጫን እዚህ ይመዝግቡ።'
            : 'Upload your transfer receipt via Bank or Telebirr to record your contribution.'}
        </p>
      </div>

      <ContributeForm locale={locale} accounts={accounts || []} />
    </main>
  );
}

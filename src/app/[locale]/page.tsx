import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  getEthiopianDateParts,
  formatEthiopianMonth,
  formatEthiopianDay,
} from '@/lib/ethiopian-calendar';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Home');

  // 1. Get current Ethiopian month key (e.g. '2019-03' for Hidar 2019 E.C.)
  const { monthKey: currentEthMonth } = getEthiopianDateParts();
  const monthLabel = formatEthiopianMonth(currentEthMonth, locale);

  // 2. Fetch monthly total & reconciliation status from Supabase public view
  const { data: monthlyData } = await supabase
    .from('public_monthly_totals')
    .select('total_birr, contributions, is_reconciled')
    .eq('ethiopian_month', currentEthMonth)
    .maybeSingle();

  // 3. Fetch recent contributions for the anonymous public feed
  const { data: feed } = await supabase
    .from('public_feed')
    .select('id, amount_birr, kind, created_at, display_name')
    .eq('ethiopian_month', currentEthMonth)
    .order('created_at', { ascending: false })
    .limit(10);

  const totalBirr = Number(monthlyData?.total_birr ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isReconciled = Boolean(monthlyData?.is_reconciled);

  return (
    <main className="space-y-8">
      {/* Vision Banner */}
      <section className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-[#1B4332] dark:text-emerald-400">
          {t('title')}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-400 max-w-xl mx-auto">
          {t('subtitle')}
        </p>
      </section>

      {/* Hero Monthly Total Card */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 p-8 shadow-sm text-center space-y-3">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold text-[#1B4332] dark:text-emerald-400">
            {monthLabel}
          </span>
          <span
            className={`inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
              isReconciled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {isReconciled
              ? locale === 'am'
                ? 'በባንክ የተረጋገጠ ጠቅላላ ገቢ'
                : 'Verified & Reconciled Total'
              : t('reportedTotal')}
          </span>
        </div>

        <p className="text-4xl sm:text-5xl font-bold tabular-nums text-[#1B4332] dark:text-emerald-400">
          {totalBirr} <span className="text-2xl font-semibold text-amber-600">ETB</span>
        </p>

        <p className="text-xs text-stone-500 dark:text-slate-400">
          {isReconciled
            ? locale === 'am'
              ? 'ይህ መጠን ከባንክ እና ቴሌብር መግለጫ ጋር ተመሳክሯል።'
              : 'Reconciled against official bank & Telebirr statements.'
            : t('pendingReconciliation')}
        </p>
      </section>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/${locale}/contribute`}
          className="py-3.5 px-5 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white font-semibold text-center shadow-sm transition"
        >
          {t('submitContribution')}
        </Link>
        <Link
          href={`/${locale}/join`}
          className="py-3.5 px-5 rounded-xl border border-[#1B4332]/30 dark:border-emerald-500/30 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 font-semibold text-center transition"
        >
          {t('becomePartner')}
        </Link>
      </div>

      {/* Anonymous Public Feed */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t('recentContributions')} ({monthLabel})
        </h2>
        <div className="divide-y divide-stone-200 dark:divide-slate-800 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {feed && feed.length > 0 ? (
            feed.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>
                    {item.display_name
                      ? t('namedEntry', {
                          name: item.display_name,
                          amount: Number(item.amount_birr).toLocaleString(),
                        })
                      : t('anonymousEntry', {
                          amount: Number(item.amount_birr).toLocaleString(),
                        })}
                  </span>
                </div>
                <span className="text-xs text-stone-400">
                  {formatEthiopianDay(item.created_at, locale)}
                </span>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-stone-500">
              {t('noContributions')}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
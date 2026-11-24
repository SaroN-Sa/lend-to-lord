import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isValidLocale } from '@/i18n/routing';
import { supabase } from '@/lib/supabase/client';
import { formatEthiopianMonth } from '@/lib/ethiopian-calendar';

export const dynamic = 'force-dynamic';

export default async function MonthlyUpdatePage({
  params,
}: {
  params: Promise<{ locale: string; month: string }>;
}) {
  const { locale, month } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const monthLabel = formatEthiopianMonth(month, locale);

  // Fetch published monthly update & that month's total
  const { data: update } = await supabase
    .from('monthly_updates')
    .select('ethiopian_month, title_am, title_en, body_am, body_en, published')
    .eq('ethiopian_month', month)
    .maybeSingle();

  const { data: monthlyData } = await supabase
    .from('public_monthly_totals')
    .select('total_birr, contributions')
    .eq('ethiopian_month', month)
    .maybeSingle();

  const totalBirr = Number(monthlyData?.total_birr ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const title =
    locale === 'am'
      ? update?.title_am || update?.title_en
      : update?.title_en || update?.title_am;

  const body =
    locale === 'am'
      ? update?.body_am || update?.body_en
      : update?.body_en || update?.body_am;

  const isFallbackLanguage =
    (locale === 'am' && !update?.body_am && update?.body_en) ||
    (locale === 'en' && !update?.body_en && update?.body_am);

  return (
    <main className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-800 pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {locale === 'am' ? `ወርሃዊ መልእክት • ${monthLabel}` : `Monthly Update • ${monthLabel}`}
          </span>
          <span className="text-sm font-bold tabular-nums text-[#1B4332] dark:text-emerald-400">
            {totalBirr} ETB
          </span>
        </div>

        {isFallbackLanguage && (
          <p className="text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
            {locale === 'am'
              ? 'ይህ መልእክት በአማርኛ ስላልተዘጋጀ በእንግሊዝኛ ቀርቧል።'
              : 'This update is currently only available in Amharic.'}
          </p>
        )}

        <h1 className="text-2xl font-bold text-[#1B4332] dark:text-emerald-400">
          {title || (locale === 'am' ? `የ${monthLabel} ወርሃዊ መልእክት` : `${monthLabel} Monthly Update`)}
        </h1>

        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line">
          {body ||
            (locale === 'am'
              ? 'የዚህ ወር መልእክት ገና አልተለጠፈም።'
              : 'No monthly update has been published for this month yet.')}
        </div>

        <div className="pt-4 border-t border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/contribute`}
            className="px-5 py-3 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-semibold text-center transition"
          >
            {locale === 'am' ? 'የዚህን ወር አስተዋጽኦ ያስገቡ' : 'Submit This Month’s Contribution'}
          </Link>
          <Link
            href={`/${locale}`}
            className="px-5 py-3 rounded-xl border border-stone-300 dark:border-slate-700 text-sm font-semibold text-center hover:bg-stone-100 dark:hover:bg-slate-800 transition"
          >
            {locale === 'am' ? 'ወደ መነሻ ገጽ' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </main>
  );
}

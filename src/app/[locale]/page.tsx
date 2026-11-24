import { Link } from '@/i18n/routing';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CAMPAIGN_GOAL_BIRR, UI_COPY, type AppLocale } from '@/lib/constants';
import { formatBirr, formatShortDate } from '@/lib/validation';
import { ProgressBar, StatCard } from '@/components/UiPrimitives';

export const dynamic = 'force-dynamic';

async function getPublicCampaignStats() {
  try {
    const { data, error } = await supabaseAdmin
      .from('contributions')
      .select('id, donor_name, amount_birr, bank_name, is_anonymous, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return { totalBirr: 0, donorCount: 0, recent: [] };

    const totalBirr = data.reduce((sum, r) => sum + Number(r.amount_birr || 0), 0);
    return {
      totalBirr,
      donorCount: data.length,
      recent: data.slice(0, 6),
    };
  } catch {
    return { totalBirr: 0, donorCount: 0, recent: [] };
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AppLocale = rawLocale === 'en' ? 'en' : 'am';
  const copy = UI_COPY[locale];
  const stats = await getPublicCampaignStats();

  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex items-center rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            {copy.hero.badge}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            {copy.hero.title}
          </h1>
          <p className="text-base leading-relaxed text-emerald-100 sm:text-lg">
            {copy.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/contribute"
              className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-emerald-950 shadow-md transition hover:bg-amber-300"
            >
              {copy.hero.ctaPrimary}
            </Link>
            <Link
              href="/contribute"
              className="rounded-xl border border-emerald-400/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              {copy.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* Live Campaign Progress */}
      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label={copy.progress.raised} value={formatBirr(stats.totalBirr)} accent="emerald" />
          <StatCard label={copy.progress.goal} value={formatBirr(CAMPAIGN_GOAL_BIRR)} accent="amber" />
          <StatCard
            label={copy.progress.donors}
            value={stats.donorCount}
            hint={copy.progress.verified}
            accent="slate"
          />
        </div>
        <ProgressBar current={stats.totalBirr} goal={CAMPAIGN_GOAL_BIRR} />
      </section>

      {/* 3-Step Flow */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-extrabold text-slate-900">
          {copy.stepsTitle}
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {copy.steps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="text-base font-bold text-emerald-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Verified Contributions */}
      {stats.recent.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">Recent Verified Contributions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.recent.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {item.is_anonymous ? 'Anonymous Donor' : item.donor_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.bank_name} · {formatShortDate(item.created_at)}
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-extrabold text-emerald-800">
                  {formatBirr(item.amount_birr)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
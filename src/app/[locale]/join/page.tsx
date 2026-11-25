import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { isValidLocale } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { GlassSurface } from '@/components/GlassSurface';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: 'Join' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/join`,
      languages: {
        en: '/en/join',
        am: '/am/join',
        'x-default': '/en/join',
      },
    },
  };
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations('Join');

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-16">
      <GlassSurface className="p-8 sm:p-12 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-sm sm:text-base text-muted">
            {t('description')}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/50 p-6 space-y-2">
          <p className="text-xl font-bold text-foreground">
            {t('comingSoon')}
          </p>
          <p className="text-xs sm:text-sm text-muted">
            {t('comingSoonHint')}
          </p>
        </div>

        <div>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center rounded-lg border border-border-strong px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            {t('backHome')}
          </Link>
        </div>
      </GlassSurface>
    </div>
  );
}

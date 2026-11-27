import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isValidLocale } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { HeroSection } from '@/components/home/HeroSection';
import { VisionSection } from '@/components/home/VisionSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { SponsorsSection } from '@/components/home/SponsorsSection';
import { MonthlyTotalCard } from '@/components/MonthlyTotalCard';
import { MonthlyTotalSkeleton } from '@/components/MonthlyTotalSkeleton';
import { getHeroData } from '@/lib/hero';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: 'Home' });

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        am: '/am',
        'x-default': '/en',
      },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [t, tContent, tHow, hero] = await Promise.all([
    getTranslations('Home'),
    getTranslations('content'),
    getTranslations('HowItWorks'),
    getHeroData(locale),
  ]);

  return (
    <div className="relative space-y-8">
      {/* Section 1: Hero (Sticky Stacking z-[5], below header z-30) */}
      <div className="sticky top-16 z-[5] min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 bg-background border-b border-border/20">
        <HeroSection
          locale={locale}
          title={t('title')}
          subtitle={t('subtitle')}
          ctaText={t('becomePartner')}
          hero={hero}
        />
      </div>

      {/* Section 2: Monthly Total Card (Sticky Stacking z-10) */}
      <div className="sticky top-16 z-10 min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 bg-background border-b border-border/20 shadow-lg">
        <section aria-label={t('reportedTotal')} className="w-full">
          <Suspense fallback={<MonthlyTotalSkeleton />}>
            <MonthlyTotalCard locale={locale} />
          </Suspense>
        </section>
      </div>

      {/* Section 3: How Donation Works (non-sticky on mobile/short screens, sticky at >=1024x600 z-[15]) */}
      <div
        data-testid="how-it-works-sticky"
        className="hiw-sticky-section relative z-[15] py-10 bg-background border-b border-border/20 shadow-lg"
      >
        <HowItWorksSection
          title={tHow('title')}
          subtitle={tHow('subtitle')}
          steps={[
            { title: tHow('step1Title'), description: tHow('step1Desc') },
            { title: tHow('step2Title'), description: tHow('step2Desc') },
            { title: tHow('step3Title'), description: tHow('step3Desc') },
            { title: tHow('step4Title'), description: tHow('step4Desc') },
          ]}
        />
      </div>

      {/* Section 4: Vision (Sticky Stacking z-20) */}
      <div className="sticky top-16 z-20 min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 bg-background border-b border-border/20 shadow-lg">
        <VisionSection visionText={tContent('vision')} />
      </div>

      {/* Section 5: Sponsors (Sticky Stacking z-[25], renders nothing when empty or error) */}
      <Suspense fallback={null}>
        <SponsorsSection />
      </Suspense>
    </div>
  );
}

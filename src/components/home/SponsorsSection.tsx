import * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { getSponsorsData } from '@/lib/sponsors';
import { SponsorsCarousel } from '@/components/home/SponsorsCarousel';

export async function SponsorsSection() {
  const [data, t] = await Promise.all([
    getSponsorsData(),
    getTranslations('Sponsors'),
  ]);

  if (data.status !== 'ready') {
    return null;
  }

  return (
    <div className="sticky top-16 z-[35] min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 bg-background border-b border-border/20 shadow-lg">
      <section
        aria-labelledby="sponsors-heading"
        data-testid="sponsors-section"
        className="w-full entrance-fade"
      >
        <div className="w-full max-w-5xl mx-auto px-4 space-y-6">
          <div className="text-center space-y-2">
            <h2
              id="sponsors-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            >
              {t('heading')}
            </h2>
            <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>

          <SponsorsCarousel
            sponsors={data.sponsors}
            labels={{
              previous: t('previous'),
              next: t('next'),
              pause: t('pause'),
              play: t('play'),
              opensInNewTab: t('opensInNewTab'),
            }}
          />
        </div>
      </section>
    </div>
  );
}

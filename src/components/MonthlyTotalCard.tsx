import * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { TiltCard } from '@/components/TiltCard';
import { getMonthlyTotal } from '@/lib/monthly-total';
import type { Locale } from '@/i18n/routing';

export async function MonthlyTotalCard({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  const result = await getMonthlyTotal();

  return (
    <div className="w-full max-w-xl mx-auto">
      <TiltCard className="entrance-fade">
        <div className="text-center p-6 sm:p-8 space-y-3">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted">
            {t('reportedTotal')}
          </p>

          {result.status === 'loaded' && (
            <div className="space-y-1">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                  {result.formattedAmount}
                </span>
                <span className="text-lg sm:text-xl font-bold text-muted">
                  {t('birr')}
                </span>
              </div>
              <p className="text-xs text-muted pt-2">
                {t('pendingReconciliation')}
              </p>
            </div>
          )}

          {result.status === 'empty' && (
            <div className="space-y-1 py-2">
              <p className="text-lg sm:text-xl font-semibold text-foreground">
                {t('noContributions')}
              </p>
              <p className="text-xs text-muted">
                {t('pendingReconciliation')}
              </p>
            </div>
          )}

          {result.status === 'error' && (
            <div className="space-y-1 py-2">
              <p className="text-base sm:text-lg font-medium text-foreground">
                {t('totalUnavailable')}
              </p>
              <p className="text-xs text-muted">
                {t('totalUnavailableHint')}
              </p>
            </div>
          )}
        </div>
      </TiltCard>
    </div>
  );
}

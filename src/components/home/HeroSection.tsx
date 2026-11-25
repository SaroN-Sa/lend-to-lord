import * as React from 'react';
import Link from 'next/link';

interface HeroSectionProps {
  locale: string;
  title: string;
  subtitle: string;
  ctaText: string;
}

export function HeroSection({
  locale,
  title,
  subtitle,
  ctaText,
}: HeroSectionProps) {
  return (
    <section className="text-center space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div>
        <Link
          href={`/${locale}/join`}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {ctaText}
        </Link>
      </div>

      {/* Hero Visual Frame with Token-Based Glossy Gradient Fallback */}
      <div
        data-testid="hero-visual-frame"
        className="w-full aspect-[4/3] sm:aspect-[16/9] max-w-3xl mx-auto rounded-2xl border border-border bg-gradient-to-br from-surface/80 via-surface/40 to-muted/10 shadow-sm backdrop-blur-sm flex items-center justify-center p-6 text-muted text-sm font-medium transition-all"
      >
        <div className="text-center space-y-1">
          <p className="text-foreground font-semibold">Lend To Lord</p>
          <p className="text-xs text-muted">Transparent Partner Contributions</p>
        </div>
      </div>
    </section>
  );
}

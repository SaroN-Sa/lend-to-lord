import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HeroDataState } from '@/lib/hero';

interface HeroSectionProps {
  locale: string;
  title: string;
  subtitle: string;
  ctaText: string;
  hero: HeroDataState;
}

export function HeroSection({
  locale,
  title,
  subtitle,
  ctaText,
  hero,
}: HeroSectionProps) {
  return (
    <section
      data-testid="hero-visual-frame"
      className="relative w-full min-h-[420px] sm:min-h-[540px] max-w-5xl mx-auto rounded-2xl overflow-hidden border border-border shadow-sm flex items-center justify-center px-6 py-16 sm:px-12 sm:py-20"
    >
      {/* Always-present CSS-token gradient fallback */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-gradient-to-br from-hero-gradient-from via-hero-gradient-via to-hero-gradient-to"
      />

      {/* Admin Hero Image */}
      {hero.status === 'image' && (
        <Image
          src={hero.src}
          alt={hero.alt}
          width={hero.width}
          height={hero.height}
          preload
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="absolute inset-0 z-10 h-full w-full object-cover object-center"
        />
      )}

      {/* Dark scrim overlay for WCAG AA text readability */}
      <div aria-hidden="true" className="absolute inset-0 z-20 bg-hero-scrim" />

      {/* Foreground Hero Content */}
      <div className="relative z-30 w-full text-center space-y-6 max-w-3xl mx-auto entrance-fade">
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight text-hero-text">
            {title}
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-xl text-hero-text-muted leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div>
          <Link
            href={`/${locale}/join`}
            className="inline-flex items-center justify-center rounded-xl bg-hero-cta-bg px-8 py-3.5 text-base font-bold text-hero-cta-text shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}

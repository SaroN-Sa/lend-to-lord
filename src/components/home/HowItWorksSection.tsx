import * as React from 'react';
import { GlassSurface } from '@/components/GlassSurface';
import { GlowingParticles } from '@/components/home/GlowingParticles';

interface HowItWorksProps {
  title: string;
  subtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Badge: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
}

export function HowItWorksSection({
  title,
  subtitle,
  step1Title,
  step1Desc,
  step2Badge,
  step2Title,
  step2Desc,
  step3Title,
  step3Desc,
}: HowItWorksProps) {
  return (
    <section className="relative max-w-5xl mx-auto w-full space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
          {subtitle}
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlowingParticles count={16} />

        {/* Step 1 */}
        <GlassSurface className="relative z-10 p-6 sm:p-8 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-border text-xs font-bold text-muted">
              1
            </span>
            <h3 className="text-lg font-bold text-foreground">{step1Title}</h3>
            <p className="text-sm text-muted leading-relaxed">{step1Desc}</p>
          </div>
        </GlassSurface>

        {/* Step 2 (Bold / Highlighted Verification Step) */}
        <GlassSurface className="relative z-10 p-6 sm:p-8 space-y-3 flex flex-col justify-between border-2 border-primary/60 dark:border-primary/70 shadow-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                2
              </span>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {step2Badge}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">{step2Title}</h3>
            <p className="text-sm text-muted leading-relaxed">{step2Desc}</p>
          </div>
        </GlassSurface>

        {/* Step 3 */}
        <GlassSurface className="relative z-10 p-6 sm:p-8 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-border text-xs font-bold text-muted">
              3
            </span>
            <h3 className="text-lg font-bold text-foreground">{step3Title}</h3>
            <p className="text-sm text-muted leading-relaxed">{step3Desc}</p>
          </div>
        </GlassSurface>
      </div>
    </section>
  );
}

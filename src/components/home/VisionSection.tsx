import * as React from 'react';
import { GlassSurface } from '@/components/GlassSurface';

interface VisionSectionProps {
  visionText: string;
}

export function VisionSection({ visionText }: VisionSectionProps) {
  return (
    <section className="max-w-3xl mx-auto w-full">
      <GlassSurface className="p-8 sm:p-12 text-center space-y-3">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted">
          Vision
        </p>
        <p className="text-lg sm:text-2xl text-foreground font-medium leading-relaxed">
          &ldquo;{visionText}&rdquo;
        </p>
      </GlassSurface>
    </section>
  );
}

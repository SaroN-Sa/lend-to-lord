import * as React from 'react';
import { GlassSurface } from '@/components/GlassSurface';

export function MonthlyTotalSkeleton() {
  return (
    <div className="w-full max-w-xl mx-auto animate-pulse">
      <GlassSurface className="p-8 text-center space-y-4">
        <div className="h-4 w-36 bg-muted/20 rounded mx-auto" />
        <div className="h-12 w-48 bg-muted/20 rounded-lg mx-auto" />
        <div className="h-4 w-56 bg-muted/20 rounded mx-auto" />
      </GlassSurface>
    </div>
  );
}

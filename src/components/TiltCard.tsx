'use client';

import * as React from 'react';
import { useTilt } from '@/lib/useTilt';
import { GlassSurface } from '@/components/GlassSurface';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxDeg?: number;
}

export function TiltCard({
  children,
  className = '',
  maxDeg = 6,
  ...props
}: TiltCardProps) {
  const tiltRef = useTilt<HTMLDivElement>(maxDeg);

  return (
    <div
      ref={tiltRef}
      data-testid="tilt-card"
      style={{
        transform: 'perspective(1000px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
        transformStyle: 'preserve-3d',
      }}
      className={`transition-transform duration-150 ease-out focus-within:ring-2 focus-within:ring-border-strong rounded-2xl ${className}`}
      {...props}
    >
      <GlassSurface className="h-full w-full">
        {children}
      </GlassSurface>
    </div>
  );
}

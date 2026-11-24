import * as React from 'react';

interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function GlassSurface({
  children,
  className = '',
  ...props
}: GlassSurfaceProps) {
  return (
    <div
      className={`glass-surface rounded-2xl p-6 transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

'use client';

import * as React from 'react';

interface GlowingParticlesProps {
  className?: string;
  count?: number;
}

interface ParticleConfig {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
  tx: string;
  ty: string;
}

export function GlowingParticles({
  className = '',
  count = 16,
}: GlowingParticlesProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [inView, setInView] = React.useState(true);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Deterministic particle distribution across cards
  const particles: ParticleConfig[] = React.useMemo(() => {
    const arr: ParticleConfig[] = [];
    for (let i = 0; i < count; i++) {
      const xPercent = 5 + ((i * 23) % 90);
      const yPercent = 8 + ((i * 29) % 84);
      const size = 4 + (i % 3) * 2; // 4px, 6px, or 8px
      const duration = `${3 + (i % 4) * 0.8}s`;
      const delay = `${(i % 5) * 0.4}s`;
      const tx = `${(i % 2 === 0 ? 1 : -1) * (6 + (i % 4) * 2)}px`;
      const ty = `${-(8 + (i % 5) * 2)}px`;

      arr.push({
        id: i,
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        size,
        duration,
        delay,
        tx,
        ty,
      });
    }
    return arr;
  }, [count]);

  return (
    <div
      ref={containerRef}
      data-in-view={inView ? 'true' : 'false'}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="glowing-particle absolute rounded-full bg-primary/25 dark:bg-primary/35 shadow-[0_0_8px_var(--glass-glow)]"
          style={
            {
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              '--duration': p.duration,
              '--delay': p.delay,
              '--tx': p.tx,
              '--ty': p.ty,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

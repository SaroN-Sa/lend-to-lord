'use client';

import * as React from 'react';

interface HowItWorksVisibilityProps {
  children: React.ReactNode;
}

export function HowItWorksVisibility({ children }: HowItWorksVisibilityProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setInView(entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="how-it-works-visibility"
      data-in-view={inView ? 'true' : 'false'}
      className="w-full"
    >
      {children}
    </div>
  );
}

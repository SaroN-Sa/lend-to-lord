'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { SponsorItem } from '@/lib/sponsors';
import {
  areControlsNeeded,
  getMarqueeDurationSec,
  getNextIndex,
  getPrevIndex,
  getTrackTranslateX,
} from '@/lib/carousel-logic';

export interface SponsorsCarouselLabels {
  previous: string;
  next: string;
  pause: string;
  play: string;
  opensInNewTab: string;
}

interface SponsorsCarouselProps {
  sponsors: SponsorItem[];
  labels: SponsorsCarouselLabels;
}

const DEFAULT_STEP_PX = 208;
const MIN_HALF_TILES = 6;

function SponsorTileCard({
  sponsor,
  decorative = false,
}: {
  sponsor: SponsorItem;
  decorative?: boolean;
}) {
  return (
    <>
      <div className="relative h-20 w-full max-w-[160px] mx-auto rounded-xl bg-sponsor-plate border border-border p-2.5 flex items-center justify-center">
        <Image
          src={sponsor.logoUrl}
          alt={decorative ? '' : sponsor.name}
          fill
          sizes="160px"
          className="object-contain p-2"
        />
      </div>
      <span
        title={sponsor.name}
        className="mt-2 block text-xs font-semibold text-foreground text-center truncate"
      >
        {sponsor.name}
      </span>
    </>
  );
}

export function SponsorsCarousel({ sponsors, labels }: SponsorsCarouselProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLUListElement>(null);

  const [stepIndex, setStepIndex] = React.useState(0);
  const [stepPx, setStepPx] = React.useState(DEFAULT_STEP_PX);

  // Independent stop-condition flags so hover/blur/visibility/intersection
  // never override an explicit user Pause.
  const [userPaused, setUserPaused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [hasFocusWithin, setHasFocusWithin] = React.useState(false);
  const [isTabHidden, setIsTabHidden] = React.useState(false);
  const [isOffScreen, setIsOffScreen] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  const controlsActive = areControlsNeeded(sponsors.length);

  const safeIndex =
    sponsors.length > 0 && stepIndex < sponsors.length ? stepIndex : 0;

  // Detect reduced motion preference
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Measure tile stride for manual Previous/Next X-axis stepping
  React.useEffect(() => {
    if (!controlsActive) return;
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const first = track.children[0] as HTMLElement | undefined;
      const second = track.children[1] as HTMLElement | undefined;
      if (!first) return;

      if (second) {
        const stride = second.offsetLeft - first.offsetLeft;
        if (stride > 0) {
          setStepPx(stride);
          return;
        }
      }

      if (first.offsetWidth > 0) {
        setStepPx(first.offsetWidth + 16);
      }
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [controlsActive, sponsors.length]);

  // Pause when document tab is hidden
  React.useEffect(() => {
    if (!controlsActive || typeof document === 'undefined') return;
    const onVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [controlsActive]);

  // Pause when carousel is off-screen
  React.useEffect(() => {
    if (!controlsActive) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsOffScreen(!entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [controlsActive]);

  const isPaused =
    userPaused ||
    isHovered ||
    hasFocusWithin ||
    isTabHidden ||
    isOffScreen ||
    prefersReducedMotion;

  const isAnimating = controlsActive && !prefersReducedMotion && !isPaused;
  const durationSec = getMarqueeDurationSec(sponsors.length);
  const manualTranslateX =
    controlsActive && !prefersReducedMotion
      ? getTrackTranslateX(safeIndex, stepPx)
      : 0;

  function handlePrev() {
    setStepIndex((prev) => getPrevIndex(prev, sponsors.length));
  }

  function handleNext() {
    setStepIndex((prev) => getNextIndex(prev, sponsors.length));
  }

  function handleFocus() {
    setHasFocusWithin(true);
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setHasFocusWithin(false);
    }
  }

  // Build two identical halves for seamless -50% marquee looping when motion is enabled.
  // Only the first `sponsors.length` items (half 0, copy 0) are interactive/exposed to AT.
  const renderedTiles = React.useMemo(() => {
    if (!controlsActive || prefersReducedMotion) {
      return sponsors.map((sponsor) => ({
        key: sponsor.id,
        sponsor,
        isPrimary: true,
      }));
    }

    const halfCopies = Math.max(1, Math.ceil(MIN_HALF_TILES / sponsors.length));
    const list: Array<{
      key: string;
      sponsor: SponsorItem;
      isPrimary: boolean;
    }> = [];

    for (let half = 0; half < 2; half++) {
      for (let copy = 0; copy < halfCopies; copy++) {
        for (const sponsor of sponsors) {
          const isPrimary = half === 0 && copy === 0;
          list.push({
            key: isPrimary ? sponsor.id : `${sponsor.id}-h${half}-c${copy}`,
            sponsor,
            isPrimary,
          });
        }
      }
    }

    return list;
  }, [controlsActive, prefersReducedMotion, sponsors]);

  return (
    <div
      ref={containerRef}
      data-testid="sponsors-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="w-full min-w-0 space-y-4"
    >
      <div
        className={`w-full min-w-0 overflow-hidden ${
          controlsActive && !prefersReducedMotion ? 'sponsors-edge-fade' : ''
        }`}
      >
        <div
          data-testid="sponsors-step-wrapper"
          style={
            controlsActive && !prefersReducedMotion
              ? {
                  transform: `translate3d(${manualTranslateX}px, 0, 0)`,
                  transition: 'transform 300ms ease-out',
                }
              : undefined
          }
        >
          <ul
            ref={trackRef}
            data-testid="sponsors-track"
            aria-live={isAnimating ? 'off' : 'polite'}
            style={
              controlsActive && !prefersReducedMotion
                ? {
                    animationDuration: `${durationSec}s`,
                    animationPlayState: isPaused ? 'paused' : 'running',
                    willChange: isAnimating ? 'transform' : 'auto',
                  }
                : undefined
            }
            className={
              controlsActive
                ? prefersReducedMotion
                  ? 'flex flex-wrap justify-center gap-4 py-2 px-1'
                  : 'sponsors-marquee-track gap-4 py-2 px-1'
                : 'flex justify-center gap-4 py-2 px-1'
            }
          >
            {renderedTiles.map(({ key, sponsor, isPrimary }) => {
              if (!isPrimary) {
                return (
                  <li
                    key={key}
                    aria-hidden="true"
                    className="w-[176px] sm:w-[192px] shrink-0 rounded-2xl border border-border bg-surface p-3 select-none pointer-events-none"
                  >
                    <SponsorTileCard sponsor={sponsor} decorative />
                  </li>
                );
              }

              return (
                <li
                  key={key}
                  data-testid="sponsor-tile"
                  className="w-[176px] sm:w-[192px] shrink-0 rounded-2xl border border-border bg-surface p-3"
                >
                  {sponsor.websiteUrl ? (
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong transition hover:opacity-90"
                    >
                      <SponsorTileCard sponsor={sponsor} />
                      <span className="sr-only"> ({labels.opensInNewTab})</span>
                    </a>
                  ) : (
                    <div>
                      <SponsorTileCard sponsor={sponsor} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {controlsActive && !prefersReducedMotion && (
        <div
          data-testid="sponsors-controls"
          className="flex items-center justify-center gap-3"
        >
          <button
            type="button"
            aria-label={labels.previous}
            onClick={handlePrev}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong transition"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label={userPaused ? labels.play : labels.pause}
            aria-pressed={userPaused}
            onClick={() => setUserPaused((prev) => !prev)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong transition"
          >
            {userPaused ? (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{labels.play}</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{labels.pause}</span>
              </>
            )}
          </button>

          <button
            type="button"
            aria-label={labels.next}
            onClick={handleNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong transition"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

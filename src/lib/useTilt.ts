'use client';

import { useEffect, useRef } from 'react';
import { computeTilt } from '@/lib/tilt';

export function useTilt<T extends HTMLElement>(maxDeg = 6) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;

    const checkCapabilities = () => {
      const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return hasFinePointer && !prefersReduced;
    };

    const resetTilt = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!checkCapabilities()) {
        resetTilt();
        return;
      }

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const { rotateX, rotateY } = computeTilt(e.clientX, e.clientY, rect, maxDeg);
        el.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
        rafId = null;
      });
    };

    const handlePointerLeave = () => {
      resetTilt();
    };

    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerleave', handlePointerLeave);

    const mediaHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mediaMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMediaChange = () => {
      if (!checkCapabilities()) {
        resetTilt();
      }
    };
    mediaHover.addEventListener('change', handleMediaChange);
    mediaMotion.addEventListener('change', handleMediaChange);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resetTilt();
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
      mediaHover.removeEventListener('change', handleMediaChange);
      mediaMotion.removeEventListener('change', handleMediaChange);
    };
  }, [maxDeg]);

  return ref;
}

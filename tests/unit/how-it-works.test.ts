import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  MAX_RUNNING_ANIMATIONS,
  STEP_COUNT,
  STEP_DURATION_SECONDS,
  TOTAL_CYCLE_SECONDS,
  getConnectorDotsConfig,
  getInCardDotsConfig,
  getStepDelaySeconds,
  getTotalConfiguredAnimations,
} from '@/lib/how-it-works-particles';

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseCssColor(raw: string): Rgba {
  const val = raw.trim();
  if (val.startsWith('#')) {
    const hex = val.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgbaMatch = val.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i
  );
  if (!rgbaMatch) {
    throw new Error(`Unsupported color token: ${raw}`);
  }
  return {
    r: Number(rgbaMatch[1]),
    g: Number(rgbaMatch[2]),
    b: Number(rgbaMatch[3]),
    a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
  };
}

function compositeOver(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function relativeLuminance(c: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

function contrastRatio(c1: Rgba, c2: Rgba): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractThemeTokens(css: string, selectorRegex: RegExp): Record<string, string> {
  const match = css.match(selectorRegex);
  if (!match) {
    throw new Error(`Theme block not found for ${selectorRegex}`);
  }
  const block = match[1];
  const tokens: Record<string, string> = {};
  const propRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let propMatch: RegExpExecArray | null;
  while ((propMatch = propRegex.exec(block)) !== null) {
    tokens[propMatch[1]] = propMatch[2].trim();
  }
  return tokens;
}

describe('Task 10: How Donation Works Particle Config, Delays & WCAG Contrast', () => {
  it('1. Particle configuration is deterministic and within <= 24 animation budget', () => {
    const total = getTotalConfiguredAnimations();
    expect(total).toBeLessThanOrEqual(MAX_RUNNING_ANIMATIONS);
    expect(total).toBe(23);

    const dotsA = getInCardDotsConfig();
    const dotsB = getInCardDotsConfig();
    expect(dotsA).toEqual(dotsB);
    expect(dotsA).toHaveLength(8);

    for (const dot of dotsA) {
      expect(dot.startXPercent).toBeGreaterThanOrEqual(0);
      expect(dot.startXPercent).toBeLessThanOrEqual(100);
      expect(dot.startYPercent).toBeGreaterThanOrEqual(0);
      expect(dot.startYPercent).toBeLessThanOrEqual(100);
      expect(dot.sizePx).toBeGreaterThan(0);
      expect(dot.delaySeconds).toBeGreaterThanOrEqual(0);
      expect(dot.delaySeconds).toBeLessThan(TOTAL_CYCLE_SECONDS);
    }

    const connectorsA = getConnectorDotsConfig();
    const connectorsB = getConnectorDotsConfig();
    expect(connectorsA).toEqual(connectorsB);
    expect(connectorsA).toHaveLength(3);
  });

  it('2. Step delays are strictly ordered, spaced by STEP_DURATION_SECONDS, and wrap cleanly', () => {
    expect(STEP_COUNT).toBe(4);
    expect(TOTAL_CYCLE_SECONDS).toBe(4 * STEP_DURATION_SECONDS);

    const delays = [0, 1, 2, 3].map((i) => getStepDelaySeconds(i));
    expect(delays).toEqual([0, 3, 6, 9]);

    for (let i = 1; i < delays.length; i++) {
      expect(delays[i] - delays[i - 1]).toBe(STEP_DURATION_SECONDS);
    }

    expect(getStepDelaySeconds(4)).toBe(getStepDelaySeconds(0));
    expect(getStepDelaySeconds(5)).toBe(getStepDelaySeconds(1));
  });

  it('3. Real globals.css tokens meet WCAG AA (>= 4.5:1) in light and dark themes', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    const light = extractThemeTokens(css, /:root,\s*\[data-theme="light"\]\s*\{([\s\S]*?)\}/);
    const dark = extractThemeTokens(css, /\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);

    const report: Record<string, number> = {};

    for (const [themeName, tokens] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      const surface = parseCssColor(tokens['--surface']);
      const fg = parseCssColor(tokens['--foreground']);
      const muted = parseCssColor(tokens['--muted']);
      const overlay = parseCssColor(tokens['--hiw-active-overlay']);
      const activeSurface = compositeOver(overlay, surface);
      const badgeBg = parseCssColor(tokens['--hiw-active-badge-bg']);
      const badgeText = parseCssColor(tokens['--hiw-active-badge-text']);

      const titleNormal = contrastRatio(fg, surface);
      const descNormal = contrastRatio(muted, surface);
      const titleActive = contrastRatio(fg, activeSurface);
      const descActive = contrastRatio(muted, activeSurface);
      const badgeContrast = contrastRatio(badgeText, badgeBg);

      report[`${themeName}.titleNormal`] = Number(titleNormal.toFixed(2));
      report[`${themeName}.descNormal`] = Number(descNormal.toFixed(2));
      report[`${themeName}.titleActive`] = Number(titleActive.toFixed(2));
      report[`${themeName}.descActive`] = Number(descActive.toFixed(2));
      report[`${themeName}.badgeContrast`] = Number(badgeContrast.toFixed(2));

      expect(titleNormal).toBeGreaterThanOrEqual(4.5);
      expect(descNormal).toBeGreaterThanOrEqual(4.5);
      expect(titleActive).toBeGreaterThanOrEqual(4.5);
      expect(descActive).toBeGreaterThanOrEqual(4.5);
      expect(badgeContrast).toBeGreaterThanOrEqual(4.5);
    }

    // Surface computed values in Vitest output for exact reporting
    console.info('[how-it-works:contrast]', JSON.stringify(report));
  });
});

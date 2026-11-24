import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { computeTilt } from '@/lib/tilt';

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): RGB {
  const clean = hex.replace('#', '').trim();
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.substring(i, i + 2), 16));
  return { r, g, b };
}

function parseRgba(rgbaStr: string): RGBA {
  const match = rgbaStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!match) {
    throw new Error(`Invalid rgba string: ${rgbaStr}`);
  }
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

function composite(fg: RGBA, bg: RGB): RGB {
  return {
    r: Math.round(fg.a * fg.r + (1 - fg.a) * bg.r),
    g: Math.round(fg.a * fg.g + (1 - fg.a) * bg.g),
    b: Math.round(fg.a * fg.b + (1 - fg.a) * bg.b),
  };
}

function getLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(c1: RGB, c2: RGB): number {
  const l1 = getLuminance(c1);
  const l2 = getLuminance(c2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

function parseTokens(cssContent: string) {
  const extractVar = (block: string, varName: string): string => {
    const match = block.match(new RegExp(`${varName}:\\s*([^;\\n}]+)`));
    if (!match) {
      throw new Error(`Token ${varName} not found`);
    }
    return match[1].trim();
  };

  const lightMatch = cssContent.match(/(?:^|\n)\s*(?::root,\s*\n?\s*\[data-theme="light"\]|\[data-theme="light"\])\s*\{([\s\S]*?)\}/);
  if (!lightMatch) throw new Error('Light theme CSS block not found');
  const lightBlock = lightMatch[1];

  const darkMatch = cssContent.match(/(?:^|\n)\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
  if (!darkMatch) throw new Error('Dark theme CSS block not found');
  const darkBlock = darkMatch[1];

  return {
    light: {
      background: parseHex(extractVar(lightBlock, '--background')),
      surface: parseHex(extractVar(lightBlock, '--surface')),
      foreground: parseHex(extractVar(lightBlock, '--foreground')),
      muted: parseHex(extractVar(lightBlock, '--muted')),
      glassBg: parseRgba(extractVar(lightBlock, '--glass-bg')),
    },
    dark: {
      background: parseHex(extractVar(darkBlock, '--background')),
      surface: parseHex(extractVar(darkBlock, '--surface')),
      foreground: parseHex(extractVar(darkBlock, '--foreground')),
      muted: parseHex(extractVar(darkBlock, '--muted')),
      glassBg: parseRgba(extractVar(darkBlock, '--glass-bg')),
    },
  };
}

describe('Task 4: Tilt Math (computeTilt)', () => {
  const rect = { left: 100, top: 100, width: 200, height: 100 };

  it('returns { rotateX: 0, rotateY: 0 } at the exact center of the rect', () => {
    const result = computeTilt(200, 150, rect, 6);
    expect(result.rotateX).toBeCloseTo(0, 5);
    expect(result.rotateY).toBeCloseTo(0, 5);
  });

  it('clamps strictly within [-maxDeg, +maxDeg] for out-of-bounds cursor inputs', () => {
    const maxDeg = 6;

    // Far top-left
    const topLeft = computeTilt(-1000, -1000, rect, maxDeg);
    expect(topLeft.rotateX).toBeLessThanOrEqual(maxDeg);
    expect(topLeft.rotateX).toBeGreaterThanOrEqual(-maxDeg);
    expect(topLeft.rotateY).toBeLessThanOrEqual(maxDeg);
    expect(topLeft.rotateY).toBeGreaterThanOrEqual(-maxDeg);

    // Far bottom-right
    const bottomRight = computeTilt(5000, 5000, rect, maxDeg);
    expect(bottomRight.rotateX).toBeLessThanOrEqual(maxDeg);
    expect(bottomRight.rotateX).toBeGreaterThanOrEqual(-maxDeg);
    expect(bottomRight.rotateY).toBeLessThanOrEqual(maxDeg);
    expect(bottomRight.rotateY).toBeGreaterThanOrEqual(-maxDeg);
  });

  it('handles zero-sized rects safely without NaN or infinite values', () => {
    const zeroRect = { left: 0, top: 0, width: 0, height: 0 };
    const result = computeTilt(50, 50, zeroRect, 6);
    expect(result.rotateX).toBe(0);
    expect(result.rotateY).toBe(0);
    expect(Number.isNaN(result.rotateX)).toBe(false);
    expect(Number.isNaN(result.rotateY)).toBe(false);
  });
});

describe('Task 4: Glass Contrast over Background & Surface (WCAG AA)', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const tokens = parseTokens(cssContent);

  describe('Light Theme Composited Contrast', () => {
    const { light } = tokens;
    const compOnBg = composite(light.glassBg, light.background);
    const compOnSurface = composite(light.glassBg, light.surface);

    it('foreground on glass-bg (over background) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.foreground, compOnBg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on glass-bg (over background) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.muted, compOnBg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('foreground on glass-bg (over surface) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.foreground, compOnSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on glass-bg (over surface) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.muted, compOnSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('opaque fallback (surface) meets WCAG AA for foreground and muted', () => {
      expect(getContrastRatio(light.foreground, light.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(light.muted, light.surface)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Dark Theme Composited Contrast', () => {
    const { dark } = tokens;
    const compOnBg = composite(dark.glassBg, dark.background);
    const compOnSurface = composite(dark.glassBg, dark.surface);

    it('foreground on glass-bg (over background) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.foreground, compOnBg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on glass-bg (over background) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.muted, compOnBg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('foreground on glass-bg (over surface) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.foreground, compOnSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on glass-bg (over surface) meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.muted, compOnSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('opaque fallback (surface) meets WCAG AA for foreground and muted', () => {
      expect(getContrastRatio(dark.foreground, dark.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(dark.muted, dark.surface)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

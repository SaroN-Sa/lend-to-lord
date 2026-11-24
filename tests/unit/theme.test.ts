import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface ThemeTokens {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  primary: string;
  primaryForeground: string;
  border: string;
  borderStrong: string;
}

function parseTokens(cssContent: string): { light: ThemeTokens; dark: ThemeTokens } {
  // Helper to extract a variable value within a block
  const extractVar = (block: string, varName: string): string => {
    const match = block.match(new RegExp(`${varName}:\\s*(#[0-9a-fA-F]{3,8})`));
    if (!match) {
      throw new Error(`Token ${varName} not found in CSS block: ${block}`);
    }
    return match[1].toLowerCase();
  };

  // Find light block starting at beginning of line: :root,\n[data-theme="light"] { ... }
  const lightMatch = cssContent.match(/(?:^|\n)\s*(?::root,\s*\n?\s*\[data-theme="light"\]|\[data-theme="light"\])\s*\{([\s\S]*?)\}/);
  if (!lightMatch) {
    throw new Error('Light theme CSS block not found');
  }
  const lightBlock = lightMatch[1];

  // Find dark block starting at beginning of line: [data-theme="dark"] { ... }
  const darkMatch = cssContent.match(/(?:^|\n)\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
  if (!darkMatch) {
    throw new Error('Dark theme CSS block not found');
  }
  const darkBlock = darkMatch[1];

  const parseBlock = (block: string): ThemeTokens => ({
    background: extractVar(block, '--background'),
    surface: extractVar(block, '--surface'),
    foreground: extractVar(block, '--foreground'),
    muted: extractVar(block, '--muted'),
    primary: extractVar(block, '--primary'),
    primaryForeground: extractVar(block, '--primary-foreground'),
    border: extractVar(block, '--border'),
    borderStrong: extractVar(block, '--border-strong'),
  });

  return {
    light: parseBlock(lightBlock),
    dark: parseBlock(darkBlock),
  };
}

function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.substring(i, i + 2), 16) / 255);
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

describe('Design Tokens WCAG AA Contrast', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const tokens = parseTokens(cssContent);

  describe('Light Theme Tokens', () => {
    const { light } = tokens;

    it('foreground on background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.foreground, light.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('foreground on surface meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.foreground, light.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.muted, light.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on surface meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.muted, light.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary on background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.primary, light.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary on surface meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.primary, light.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary-foreground on primary meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(light.primaryForeground, light.primary);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('border-strong on background meets WCAG AA (>= 3.0:1)', () => {
      const ratio = getContrastRatio(light.borderStrong, light.background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    it('border-strong on surface meets WCAG AA (>= 3.0:1)', () => {
      const ratio = getContrastRatio(light.borderStrong, light.surface);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    it('border is defined and distinct from background and surface', () => {
      expect(light.border).toBeDefined();
      expect(light.border).not.toBe(light.background);
      expect(light.border).not.toBe(light.surface);
    });
  });

  describe('Dark Theme Tokens', () => {
    const { dark } = tokens;

    it('foreground on background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.foreground, dark.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('foreground on surface meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.foreground, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.muted, dark.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted on surface meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.muted, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary on background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.primary, dark.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary on surface meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.primary, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primary-foreground on primary meets WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(dark.primaryForeground, dark.primary);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('border-strong on background meets WCAG AA (>= 3.0:1)', () => {
      const ratio = getContrastRatio(dark.borderStrong, dark.background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    it('border-strong on surface meets WCAG AA (>= 3.0:1)', () => {
      const ratio = getContrastRatio(dark.borderStrong, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    it('border is defined and distinct from background and surface', () => {
      expect(dark.border).toBeDefined();
      expect(dark.border).not.toBe(dark.background);
      expect(dark.border).not.toBe(dark.surface);
    });
  });
});

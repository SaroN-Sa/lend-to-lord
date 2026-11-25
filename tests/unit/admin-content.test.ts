import { describe, it, expect } from 'vitest';
import {
  heroInputSchema,
  sponsorInputSchema,
  websiteUrlSchema,
  sponsorIdSchema,
  storagePathSchema,
} from '@/lib/admin/content-schema';
import { calculateShrunkDimensions } from '@/lib/admin/shrink-math';
import {
  validateImageBuffer,
  HERO_LIMITS,
  LOGO_LIMITS,
} from '@/lib/admin/image-validator';

// -------------------------------------------------------------
// HELPER: BUILD MINIMAL BINARY FIXTURES
// -------------------------------------------------------------

function createMinimalPng(width = 100, height = 50): Uint8Array {
  const buf = new Uint8Array(33);
  // PNG signature
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // Chunk length (13)
  buf.set([0x00, 0x00, 0x00, 0x0d], 8);
  // Chunk type 'IHDR'
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  // Width (big endian)
  buf[16] = (width >> 24) & 0xff;
  buf[17] = (width >> 16) & 0xff;
  buf[18] = (width >> 8) & 0xff;
  buf[19] = width & 0xff;
  // Height (big endian)
  buf[20] = (height >> 24) & 0xff;
  buf[21] = (height >> 16) & 0xff;
  buf[22] = (height >> 8) & 0xff;
  buf[23] = height & 0xff;
  // Bit depth 8, truecolor with alpha, etc.
  buf.set([0x08, 0x06, 0x00, 0x00, 0x00], 24);
  // CRC
  buf.set([0x00, 0x00, 0x00, 0x00], 29);
  return buf;
}

function createMinimalJpeg(width = 100, height = 50): Uint8Array {
  // SOI (2 bytes) + SOF0 (2 bytes marker + 2 bytes len + 1 prec + 2 h + 2 w + 3 comp) + EOI (2 bytes)
  const buf = new Uint8Array(20);
  buf[0] = 0xff;
  buf[1] = 0xd8; // SOI

  buf[2] = 0xff;
  buf[3] = 0xc0; // SOF0
  buf[4] = 0x00;
  buf[5] = 0x11; // Length 17
  buf[6] = 0x08; // Precision 8

  // Height (big endian)
  buf[7] = (height >> 8) & 0xff;
  buf[8] = height & 0xff;

  // Width (big endian)
  buf[9] = (width >> 8) & 0xff;
  buf[10] = width & 0xff;

  buf[11] = 0x03; // 3 components

  // EOI
  buf[18] = 0xff;
  buf[19] = 0xd9;
  return buf;
}

function createMinimalWebpVp8(width = 100, height = 50): Uint8Array {
  const buf = new Uint8Array(34);
  // 'RIFF'
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  // File size
  buf.set([0x1a, 0x00, 0x00, 0x00], 4);
  // 'WEBP'
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  // 'VP8 '
  buf.set([0x56, 0x50, 0x38, 0x20], 12);
  // Chunk size
  buf.set([0x0e, 0x00, 0x00, 0x00], 16);
  // Frame tag (keyframe: bit 0 of byte 23 is 0)
  buf[23] = 0x00;
  // Start code: 0x9D 0x01 0x2A
  buf.set([0x9d, 0x01, 0x2a], 26);
  // Width (16-bit LE, lower 14 bits)
  buf[29] = width & 0xff;
  buf[30] = (width >> 8) & 0x3f;
  // Height (16-bit LE, lower 14 bits)
  buf[31] = height & 0xff;
  buf[32] = (height >> 8) & 0x3f;
  return buf;
}

function createMinimalWebpVp8l(width = 100, height = 50): Uint8Array {
  const buf = new Uint8Array(30);
  // 'RIFF'
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  buf.set([0x16, 0x00, 0x00, 0x00], 4);
  // 'WEBP'
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  // 'VP8L'
  buf.set([0x56, 0x50, 0x38, 0x4c], 12);
  buf.set([0x0a, 0x00, 0x00, 0x00], 16);
  // Signature 0x2F
  buf[20] = 0x2f;
  // 14-bit width - 1, 14-bit height - 1
  const w = width - 1;
  const h = height - 1;
  buf[21] = w & 0xff;
  buf[22] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6);
  buf[23] = (h >> 2) & 0xff;
  buf[24] = (h >> 10) & 0x0f;
  return buf;
}

function createMinimalWebpVp8x(width = 100, height = 50): Uint8Array {
  const buf = new Uint8Array(30);
  // 'RIFF'
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  buf.set([0x16, 0x00, 0x00, 0x00], 4);
  // 'WEBP'
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  // 'VP8X'
  buf.set([0x56, 0x50, 0x38, 0x58], 12);
  buf.set([0x0a, 0x00, 0x00, 0x00], 16);
  // Flags (4 bytes)
  buf.set([0x00, 0x00, 0x00, 0x00], 20);
  // 24-bit canvas width - 1 (LE)
  const w = width - 1;
  buf[24] = w & 0xff;
  buf[25] = (w >> 8) & 0xff;
  buf[26] = (w >> 16) & 0xff;
  // 24-bit canvas height - 1 (LE)
  const h = height - 1;
  buf[27] = h & 0xff;
  buf[28] = (h >> 8) & 0xff;
  buf[29] = (h >> 16) & 0xff;
  return buf;
}

// -------------------------------------------------------------
// TESTS
// -------------------------------------------------------------

describe('Task 7: Zod Schemas Validation', () => {
  describe('sponsorInputSchema & websiteUrlSchema', () => {
    it('accepts valid sponsor input with valid https URL', () => {
      const result = sponsorInputSchema.safeParse({
        name: 'Awash Bank',
        website_url: 'https://awashbank.com',
        sort_order: 10,
        is_active: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name or whitespace-only name', () => {
      expect(sponsorInputSchema.safeParse({ name: '', sort_order: 0 }).success).toBe(false);
      expect(sponsorInputSchema.safeParse({ name: '   ', sort_order: 0 }).success).toBe(false);
    });

    it('rejects sponsor name longer than 120 chars', () => {
      const longName = 'A'.repeat(121);
      expect(sponsorInputSchema.safeParse({ name: longName, sort_order: 0 }).success).toBe(false);
    });

    it('accepts valid https URL and rejects http, javascript, data, protocol-relative, credentials', () => {
      expect(websiteUrlSchema.safeParse('https://example.com').success).toBe(true);
      expect(websiteUrlSchema.safeParse('').success).toBe(true);
      expect(websiteUrlSchema.safeParse(undefined).success).toBe(true);

      // Rejections
      expect(websiteUrlSchema.safeParse('http://insecure.com').success).toBe(false);
      expect(websiteUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
      expect(websiteUrlSchema.safeParse('data:text/html,bad').success).toBe(false);
      expect(websiteUrlSchema.safeParse('//evil.com').success).toBe(false);
      expect(websiteUrlSchema.safeParse('https://user:pass@example.com').success).toBe(false);
      expect(websiteUrlSchema.safeParse('https://' + 'a'.repeat(500) + '.com').success).toBe(false);
    });

    it('rejects invalid sort_order (non-integer, out of bounds)', () => {
      expect(sponsorInputSchema.safeParse({ name: 'Test', sort_order: 1.5 }).success).toBe(false);
      expect(sponsorInputSchema.safeParse({ name: 'Test', sort_order: NaN }).success).toBe(false);
      expect(sponsorInputSchema.safeParse({ name: 'Test', sort_order: -2000 }).success).toBe(false);
      expect(sponsorInputSchema.safeParse({ name: 'Test', sort_order: 20000 }).success).toBe(false);
    });

    it('validates sponsor UUID', () => {
      expect(sponsorIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
      expect(sponsorIdSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(sponsorIdSchema.safeParse('').success).toBe(false);
    });
  });

  describe('heroInputSchema', () => {
    it('accepts valid alt text when image is present', () => {
      const res = heroInputSchema.safeParse({
        alt_en: 'Congregation at church',
        alt_am: 'የአምልኮ ህብረት',
        hasImage: true,
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty alt_en when image is set', () => {
      const res = heroInputSchema.safeParse({
        alt_en: '',
        alt_am: '',
        hasImage: true,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('required when a hero image is set');
      }
    });

    it('allows empty alt_en when no image is set', () => {
      const res = heroInputSchema.safeParse({
        alt_en: '',
        alt_am: '',
        hasImage: false,
      });
      expect(res.success).toBe(true);
    });

    it('rejects alt text over 200 chars', () => {
      const res = heroInputSchema.safeParse({
        alt_en: 'A'.repeat(201),
        hasImage: false,
      });
      expect(res.success).toBe(false);
    });
  });

  describe('storagePathSchema', () => {
    it('allows valid hero and sponsor paths', () => {
      expect(storagePathSchema.safeParse('hero/123e4567-e89b-12d3-a456-426614174000.webp').success).toBe(true);
      expect(storagePathSchema.safeParse('sponsors/logo.png').success).toBe(true);
    });

    it('rejects paths with .. or invalid prefixes', () => {
      expect(storagePathSchema.safeParse('hero/../secret.txt').success).toBe(false);
      expect(storagePathSchema.safeParse('../etc/passwd').success).toBe(false);
      expect(storagePathSchema.safeParse('avatars/pic.jpg').success).toBe(false);
      expect(storagePathSchema.safeParse('').success).toBe(false);
    });
  });
});

describe('Task 7: Shrink Math Calculation', () => {
  it('resizes proportionally when width exceeds maxWidth', () => {
    const res = calculateShrunkDimensions(3200, 1800, 1600);
    expect(res.width).toBe(1600);
    expect(res.height).toBe(900);
  });

  it('never upscales if width is smaller than or equal to maxWidth', () => {
    const res = calculateShrunkDimensions(1200, 800, 1600);
    expect(res.width).toBe(1200);
    expect(res.height).toBe(800);

    const exact = calculateShrunkDimensions(1600, 900, 1600);
    expect(exact.width).toBe(1600);
    expect(exact.height).toBe(900);
  });

  it('handles square and tall aspect ratios', () => {
    const square = calculateShrunkDimensions(800, 800, 400);
    expect(square.width).toBe(400);
    expect(square.height).toBe(400);

    const tall = calculateShrunkDimensions(1000, 2000, 400);
    expect(tall.width).toBe(400);
    expect(tall.height).toBe(800);
  });

  it('handles invalid or zero dimensions safely without throwing', () => {
    expect(calculateShrunkDimensions(0, 100, 400)).toEqual({ width: 0, height: 0 });
    expect(calculateShrunkDimensions(-100, 100, 400)).toEqual({ width: 0, height: 0 });
    expect(calculateShrunkDimensions(100, 100, 0)).toEqual({ width: 0, height: 0 });
    expect(calculateShrunkDimensions(NaN, 100, 400)).toEqual({ width: 0, height: 0 });
  });
});

describe('Task 7: Pure Binary Image Validator', () => {
  it('validates minimal PNG with correct dimensions', () => {
    const png = createMinimalPng(640, 480);
    const res = validateImageBuffer(png, HERO_LIMITS);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.format).toBe('png');
      expect(res.width).toBe(640);
      expect(res.height).toBe(480);
      expect(res.mimeType).toBe('image/png');
    }
  });

  it('validates minimal JPEG with correct dimensions', () => {
    const jpg = createMinimalJpeg(1920, 1080);
    const res = validateImageBuffer(jpg, HERO_LIMITS);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.format).toBe('jpeg');
      expect(res.width).toBe(1920);
      expect(res.height).toBe(1080);
      expect(res.mimeType).toBe('image/jpeg');
    }
  });

  it('validates minimal WebP VP8 (Lossy)', () => {
    const webp = createMinimalWebpVp8(800, 600);
    const res = validateImageBuffer(webp, HERO_LIMITS);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.format).toBe('webp');
      expect(res.width).toBe(800);
      expect(res.height).toBe(600);
    }
  });

  it('validates minimal WebP VP8L (Lossless)', () => {
    const webp = createMinimalWebpVp8l(400, 300);
    const res = validateImageBuffer(webp, HERO_LIMITS);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.format).toBe('webp');
      expect(res.width).toBe(400);
      expect(res.height).toBe(300);
    }
  });

  it('validates minimal WebP VP8X (Extended)', () => {
    const webp = createMinimalWebpVp8x(1600, 900);
    const res = validateImageBuffer(webp, HERO_LIMITS);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.format).toBe('webp');
      expect(res.width).toBe(1600);
      expect(res.height).toBe(900);
    }
  });

  it('rejects empty file', () => {
    const res = validateImageBuffer(new Uint8Array(0), HERO_LIMITS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain('empty');
  });

  it('rejects non-whitelisted formats (SVG, GIF, HTML, text)', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(validateImageBuffer(svg, HERO_LIMITS).ok).toBe(false);

    const gif = new TextEncoder().encode('GIF89a\x01\x00\x01\x00');
    expect(validateImageBuffer(gif, HERO_LIMITS).ok).toBe(false);

    const html = new TextEncoder().encode('<!DOCTYPE html><html><body></body></html>');
    expect(validateImageBuffer(html, HERO_LIMITS).ok).toBe(false);

    const txt = new TextEncoder().encode('Just a regular text file renamed to photo.jpg');
    expect(validateImageBuffer(txt, HERO_LIMITS).ok).toBe(false);
  });

  it('rejects truncated or malformed buffers without throwing', () => {
    expect(validateImageBuffer(new Uint8Array([0x89, 0x50, 0x4e]), HERO_LIMITS).ok).toBe(false);
    expect(validateImageBuffer(new Uint8Array([0xff, 0xd8, 0xff, 0xc0]), HERO_LIMITS).ok).toBe(false);
    expect(validateImageBuffer(new Uint8Array([0x52, 0x49, 0x46, 0x46]), HERO_LIMITS).ok).toBe(false);
  });

  it('enforces maximum dimensions and megapixels', () => {
    const hugePng = createMinimalPng(4001, 100);
    const res = validateImageBuffer(hugePng, HERO_LIMITS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain('exceed maximum allowed');

    const logoHuge = createMinimalPng(2001, 100);
    const logoRes = validateImageBuffer(logoHuge, LOGO_LIMITS);
    expect(logoRes.ok).toBe(false);
  });
});

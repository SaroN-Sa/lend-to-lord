export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type ImageValidationSuccess = {
  ok: true;
  format: ImageFormat;
  width: number;
  height: number;
  mimeType: string;
  extension: string;
  byteLength: number;
};

export type ImageValidationFailure = {
  ok: false;
  reason: string;
};

export type ImageValidationResult = ImageValidationSuccess | ImageValidationFailure;

export interface ValidationLimits {
  maxWidth: number;
  maxHeight: number;
  maxMegapixels: number;
  maxSizeBytes: number;
}

export const HERO_LIMITS: ValidationLimits = {
  maxWidth: 4000,
  maxHeight: 4000,
  maxMegapixels: 16,
  maxSizeBytes: 2 * 1024 * 1024, // 2 MB
};

export const LOGO_LIMITS: ValidationLimits = {
  maxWidth: 2000,
  maxHeight: 2000,
  maxMegapixels: 4,
  maxSizeBytes: 2 * 1024 * 1024, // 2 MB
};

/**
 * Bounds-checked binary parser for JPEG, PNG, and WebP images.
 * Does not rely on any native dependencies or client-supplied headers.
 */
export function validateImageBuffer(
  buffer: Uint8Array | Buffer,
  limits: ValidationLimits
): ImageValidationResult {
  try {
    const len = buffer.length;

    if (len === 0) {
      return { ok: false, reason: 'File is empty (0 bytes)' };
    }

    if (len > limits.maxSizeBytes) {
      return {
        ok: false,
        reason: `File size (${(len / (1024 * 1024)).toFixed(2)} MB) exceeds limit of ${(limits.maxSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      };
    }

    // --- 1. PNG Detection & Parsing ---
    // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      len >= 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      // Chunk must be IHDR
      if (
        buffer[12] === 0x49 &&
        buffer[13] === 0x48 &&
        buffer[14] === 0x44 &&
        buffer[15] === 0x52
      ) {
        const width =
          ((buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19]) >>> 0;
        const height =
          ((buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23]) >>> 0;

        return checkDimensionLimits(
          'png',
          width,
          height,
          len,
          'image/png',
          'png',
          limits
        );
      }
      return { ok: false, reason: 'Corrupted PNG: missing IHDR chunk' };
    }

    // --- 2. JPEG Detection & Parsing ---
    // JPEG Signature: FF D8 FF
    if (len >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      let offset = 2;
      let markersScanned = 0;
      const MAX_MARKERS = 100;

      while (offset < len && markersScanned < MAX_MARKERS) {
        markersScanned++;
        // Find next marker prefix 0xFF
        while (offset < len && buffer[offset] === 0xff) {
          offset++;
        }

        if (offset >= len) break;

        const marker = buffer[offset];
        offset++;

        // End of image or Start of Scan: dimensions must be before SOS
        if (marker === 0xd9 || marker === 0xda) {
          break;
        }

        // Variable-length marker segments have 2-byte length
        if (offset + 2 > len) break;
        const segmentLength = (buffer[offset] << 8) | buffer[offset + 1];
        if (segmentLength < 2) {
          return { ok: false, reason: 'Corrupted JPEG: invalid segment length' };
        }

        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          if (offset + 7 <= len) {
            const height = (buffer[offset + 3] << 8) | buffer[offset + 4];
            const width = (buffer[offset + 5] << 8) | buffer[offset + 6];

            return checkDimensionLimits(
              'jpeg',
              width,
              height,
              len,
              'image/jpeg',
              'jpg',
              limits
            );
          }
          break;
        }

        offset += segmentLength;
      }

      return { ok: false, reason: 'Unable to extract valid dimensions from JPEG markers' };
    }

    // --- 3. WebP Detection & Parsing ---
    // WebP Signature: RIFF....WEBP
    if (
      len >= 25 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      const chunkType = String.fromCharCode(
        buffer[12],
        buffer[13],
        buffer[14],
        buffer[15]
      );

      // WebP VP8 (Lossy)
      if (chunkType === 'VP8 ' && len >= 34) {
        // Must be a keyframe (bit 0 of byte 23 is 0)
        const isKeyframe = (buffer[23] & 1) === 0;
        const validStartCode =
          buffer[26] === 0x9d && buffer[27] === 0x01 && buffer[28] === 0x2a;

        if (isKeyframe && validStartCode) {
          const width = (buffer[29] | (buffer[30] << 8)) & 0x3fff;
          const height = (buffer[31] | (buffer[32] << 8)) & 0x3fff;

          return checkDimensionLimits(
            'webp',
            width,
            height,
            len,
            'image/webp',
            'webp',
            limits
          );
        }
        return { ok: false, reason: 'Invalid or non-keyframe WebP VP8 chunk' };
      }

      // WebP VP8L (Lossless)
      if (chunkType === 'VP8L' && len >= 25) {
        if (buffer[20] === 0x2f) {
          const b1 = buffer[21];
          const b2 = buffer[22];
          const b3 = buffer[23];
          const b4 = buffer[24];

          const width = 1 + (b1 | ((b2 & 0x3f) << 8));
          const height = 1 + (((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)) >>> 0);

          return checkDimensionLimits(
            'webp',
            width,
            height,
            len,
            'image/webp',
            'webp',
            limits
          );
        }
        return { ok: false, reason: 'Corrupted WebP VP8L signature' };
      }

      // WebP VP8X (Extended)
      if (chunkType === 'VP8X' && len >= 30) {
        const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));

        return checkDimensionLimits(
          'webp',
          width,
          height,
          len,
          'image/webp',
          'webp',
          limits
        );
      }

      return { ok: false, reason: `Unsupported WebP chunk format: ${chunkType}` };
    }

    return {
      ok: false,
      reason: 'Unsupported image format. Allowed formats are JPEG, PNG, and WebP only.',
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Error parsing image binary data',
    };
  }
}

function checkDimensionLimits(
  format: ImageFormat,
  width: number,
  height: number,
  byteLength: number,
  mimeType: string,
  extension: string,
  limits: ValidationLimits
): ImageValidationResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, reason: 'Image dimensions must be positive non-zero integers' };
  }

  if (width > limits.maxWidth || height > limits.maxHeight) {
    return {
      ok: false,
      reason: `Dimensions (${width}×${height}) exceed maximum allowed (${limits.maxWidth}×${limits.maxHeight})`,
    };
  }

  const megapixels = (width * height) / 1_000_000;
  if (megapixels > limits.maxMegapixels) {
    return {
      ok: false,
      reason: `Total resolution (${megapixels.toFixed(1)} MP) exceeds limit of ${limits.maxMegapixels} MP`,
    };
  }

  return {
    ok: true,
    format,
    width,
    height,
    mimeType,
    extension,
    byteLength,
  };
}

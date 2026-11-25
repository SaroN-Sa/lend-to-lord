'use client';

import { calculateShrunkDimensions } from './shrink-math';

export interface ShrinkOptions {
  maxWidth: number;
  mimeType?: 'image/webp' | 'image/png' | 'image/jpeg';
  quality?: number;
}

/**
 * Resizes an image file in the browser using HTML5 Canvas.
 * Keeps aspect ratio, never upscales, and produces an optimized File.
 */
export async function shrinkImageInBrowser(
  file: File,
  options: ShrinkOptions
): Promise<File> {
  const { maxWidth, mimeType = 'image/webp', quality = 0.88 } = options;

  return new Promise((resolve, reject) => {
    // Read file as Data URL
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image in browser'));
      img.onload = () => {
        const { width, height } = calculateShrunkDimensions(
          img.naturalWidth,
          img.naturalHeight,
          maxWidth
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to obtain canvas 2D rendering context'));
          return;
        }

        // Draw and export
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas image conversion failed'));
              return;
            }

            const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg';
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
            const shrunkFile = new File([blob], `${baseName}.${ext}`, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(shrunkFile);
          },
          mimeType,
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

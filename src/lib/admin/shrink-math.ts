/**
 * Pure calculation helper to resize dimensions while preserving aspect ratio.
 * Never upscales if the original width is already smaller than or equal to maxWidth.
 */
export function calculateShrunkDimensions(
  origWidth: number,
  origHeight: number,
  maxWidth: number
): { width: number; height: number } {
  if (
    !Number.isFinite(origWidth) ||
    !Number.isFinite(origHeight) ||
    !Number.isFinite(maxWidth) ||
    origWidth <= 0 ||
    origHeight <= 0 ||
    maxWidth <= 0
  ) {
    return { width: 0, height: 0 };
  }

  // Never upscale
  if (origWidth <= maxWidth) {
    return {
      width: Math.round(origWidth),
      height: Math.round(origHeight),
    };
  }

  const ratio = maxWidth / origWidth;
  return {
    width: Math.round(maxWidth),
    height: Math.max(1, Math.round(origHeight * ratio)),
  };
}

export interface TiltResult {
  rotateX: number;
  rotateY: number;
}

export function computeTilt(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  maxDeg = 6
): TiltResult {
  if (rect.width <= 0 || rect.height <= 0) {
    return { rotateX: 0, rotateY: 0 };
  }

  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;

  const clampedX = Math.max(0, Math.min(1, x));
  const clampedY = Math.max(0, Math.min(1, y));

  const normX = clampedX * 2 - 1; // [-1, 1]
  const normY = clampedY * 2 - 1; // [-1, 1]

  const rawRotateX = -normY * maxDeg;
  const rawRotateY = normX * maxDeg;

  const rotateX = Math.max(-maxDeg, Math.min(maxDeg, rawRotateX));
  const rotateY = Math.max(-maxDeg, Math.min(maxDeg, rawRotateY));

  return { rotateX, rotateY };
}

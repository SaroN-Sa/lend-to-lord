export function getNextIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  const safeCurrent = current >= 0 && current < total ? current : 0;
  return (safeCurrent + 1) % total;
}

export function getPrevIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  const safeCurrent = current >= 0 && current < total ? current : 0;
  return (safeCurrent - 1 + total) % total;
}

export function areControlsNeeded(total: number): boolean {
  return Number.isFinite(total) && total > 1;
}

export function getTrackTranslateX(index: number, stepPx: number): number {
  if (!Number.isFinite(index) || !Number.isFinite(stepPx)) {
    return 0;
  }
  if (index <= 0 || stepPx <= 0) {
    return 0;
  }
  return -(index * stepPx);
}

export function getMarqueeDurationSec(uniqueCount: number): number {
  if (!Number.isFinite(uniqueCount) || uniqueCount <= 1) {
    return 25;
  }
  const scaled = 22 + uniqueCount * 1.5;
  return Math.min(35, Math.max(25, scaled));
}

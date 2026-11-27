export const STEP_DURATION_SECONDS = 3;
export const STEP_COUNT = 4;
export const TOTAL_CYCLE_SECONDS = STEP_DURATION_SECONDS * STEP_COUNT;
export const MAX_RUNNING_ANIMATIONS = 24;

export interface InCardDotConfig {
  id: string;
  stepIndex: number;
  startXPercent: number;
  startYPercent: number;
  sizePx: number;
  delaySeconds: number;
}

export interface ConnectorDotConfig {
  id: string;
  fromStepIndex: number;
  delaySeconds: number;
}

export function getStepDelaySeconds(stepIndex: number): number {
  const normalized = ((stepIndex % STEP_COUNT) + STEP_COUNT) % STEP_COUNT;
  return normalized * STEP_DURATION_SECONDS;
}

const IN_CARD_OFFSETS: ReadonlyArray<{
  x: number;
  y: number;
  sizePx: number;
  staggerSec: number;
}> = [
  { x: 58, y: 28, sizePx: 7, staggerSec: 0 },
  { x: 80, y: 54, sizePx: 6, staggerSec: 0.25 },
];

export function getInCardDotsConfig(): InCardDotConfig[] {
  const dots: InCardDotConfig[] = [];
  for (let stepIndex = 0; stepIndex < STEP_COUNT; stepIndex++) {
    const baseDelay = getStepDelaySeconds(stepIndex);
    IN_CARD_OFFSETS.forEach((offset, dotIndex) => {
      dots.push({
        id: `hiw-card-dot-${stepIndex + 1}-${dotIndex + 1}`,
        stepIndex,
        startXPercent: offset.x,
        startYPercent: offset.y,
        sizePx: offset.sizePx,
        delaySeconds: baseDelay + offset.staggerSec,
      });
    });
  }
  return dots;
}

export function getConnectorDotsConfig(): ConnectorDotConfig[] {
  const dots: ConnectorDotConfig[] = [];
  for (let fromStepIndex = 0; fromStepIndex < STEP_COUNT - 1; fromStepIndex++) {
    dots.push({
      id: `hiw-connector-dot-${fromStepIndex + 1}`,
      fromStepIndex,
      delaySeconds: getStepDelaySeconds(fromStepIndex),
    });
  }
  return dots;
}

export function getTotalConfiguredAnimations(): number {
  const emphasisPerStep = 3; // card scale + overlay opacity + filled badge opacity
  const emphasisTotal = STEP_COUNT * emphasisPerStep;
  const inCardDots = getInCardDotsConfig().length;
  const connectorDots = getConnectorDotsConfig().length;
  return emphasisTotal + inCardDots + connectorDots;
}

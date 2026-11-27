import * as React from 'react';
import {
  TOTAL_CYCLE_SECONDS,
  getStepDelaySeconds,
  type ConnectorDotConfig,
  type InCardDotConfig,
} from '@/lib/how-it-works-particles';

interface HowItWorksStepCardProps {
  stepIndex: number;
  title: string;
  description: string;
  dots: InCardDotConfig[];
  connectorDot?: ConnectorDotConfig;
}

export function HowItWorksStepCard({
  stepIndex,
  title,
  description,
  dots,
  connectorDot,
}: HowItWorksStepCardProps) {
  const stepNumber = stepIndex + 1;
  const delaySec = getStepDelaySeconds(stepIndex);

  const cycleStyle: React.CSSProperties = {
    animationDuration: `${TOTAL_CYCLE_SECONDS}s`,
    animationDelay: `${delaySec}s`,
  };

  return (
    <li
      data-testid={`how-step-${stepNumber}`}
      style={cycleStyle}
      className="hiw-step-card relative flex-1 min-w-0 rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3"
    >
      {/* Active step emphasis overlay (opacity-only, aria-hidden) */}
      <div
        aria-hidden="true"
        data-testid={`how-step-overlay-${stepNumber}`}
        style={cycleStyle}
        className="hiw-step-overlay pointer-events-none absolute inset-0 rounded-2xl border-2 border-hiw-active-border bg-hiw-active-overlay opacity-0"
      />

      {/* Text-free header zone: number badge + clipped in-card particles */}
      <div
        data-testid={`how-step-header-${stepNumber}`}
        className="relative z-10 h-8 w-full flex items-center justify-between overflow-hidden"
      >
        <div className="relative h-8 w-8 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-xs font-bold text-muted">
            {stepNumber}
          </span>
          <span
            aria-hidden="true"
            style={cycleStyle}
            className="hiw-badge-fill pointer-events-none absolute inset-0 inline-flex items-center justify-center rounded-lg bg-hiw-active-badge-bg text-xs font-bold text-hiw-active-badge-text opacity-0"
          >
            {stepNumber}
          </span>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none relative flex-1 h-8 overflow-hidden"
        >
          {dots.map((dot) => (
            <span
              key={dot.id}
              aria-hidden="true"
              data-testid={dot.id}
              style={{
                left: `${dot.startXPercent}%`,
                top: `${dot.startYPercent}%`,
                width: `${dot.sizePx}px`,
                height: `${dot.sizePx}px`,
                animationDuration: `${TOTAL_CYCLE_SECONDS}s`,
                animationDelay: `${dot.delaySeconds}s`,
              }}
              className="hiw-in-card-dot pointer-events-none absolute rounded-full opacity-0"
            />
          ))}
        </div>
      </div>

      {/* Step copy layered cleanly above opaque card surface */}
      <div className="relative z-10 space-y-1.5 min-w-0">
        <h3 className="text-base sm:text-lg font-bold text-foreground break-words">
          {title}
        </h3>
        <p className="text-sm text-muted leading-relaxed break-words">
          {description}
        </p>
      </div>

      {/* Connector to next step (1->2, 2->3, 3->4), spanning --hiw-connector-len gap */}
      {connectorDot && (
        <div aria-hidden="true" className="hiw-connector pointer-events-none">
          <span aria-hidden="true" className="hiw-connector-line" />
          <span
            aria-hidden="true"
            data-testid={connectorDot.id}
            style={{
              animationDuration: `${TOTAL_CYCLE_SECONDS}s`,
              animationDelay: `${connectorDot.delaySeconds}s`,
            }}
            className="hiw-connector-dot pointer-events-none rounded-full opacity-0"
          />
        </div>
      )}
    </li>
  );
}

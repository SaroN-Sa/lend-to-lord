import * as React from 'react';
import {
  getConnectorDotsConfig,
  getInCardDotsConfig,
} from '@/lib/how-it-works-particles';
import { HowItWorksVisibility } from '@/components/home/HowItWorksVisibility';
import { HowItWorksStepCard } from '@/components/home/HowItWorksStepCard';

export interface HowItWorksStepItem {
  title: string;
  description: string;
}

interface HowItWorksProps {
  title: string;
  subtitle: string;
  steps: [
    HowItWorksStepItem,
    HowItWorksStepItem,
    HowItWorksStepItem,
    HowItWorksStepItem,
  ];
}

export function HowItWorksSection({ title, subtitle, steps }: HowItWorksProps) {
  const inCardDots = getInCardDotsConfig();
  const connectorDots = getConnectorDotsConfig();

  return (
    <HowItWorksVisibility>
      <section
        aria-labelledby="how-it-works-heading"
        data-testid="how-it-works-section"
        className="relative max-w-5xl mx-auto w-full px-4 space-y-6 entrance-fade"
      >
        <div className="text-center space-y-2">
          <h2
            id="how-it-works-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <ol className="hiw-ol flex flex-col lg:flex-row items-stretch">
          {steps.map((step, index) => (
            <HowItWorksStepCard
              key={index}
              stepIndex={index}
              title={step.title}
              description={step.description}
              dots={inCardDots.filter((d) => d.stepIndex === index)}
              connectorDot={connectorDots.find(
                (c) => c.fromStepIndex === index
              )}
            />
          ))}
        </ol>
      </section>
    </HowItWorksVisibility>
  );
}

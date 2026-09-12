import * as React from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface StepperStep {
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface StepperProps extends React.ComponentProps<'ol'> {
  steps: StepperStep[];
  /** Índice (0-based) del paso actual. Los anteriores se muestran como completados. */
  current: number;
}

/** Wizard horizontal para flujos como onboarding o resumen de trato. */
function Stepper({ className, steps, current, ...props }: StepperProps) {
  return (
    <ol data-slot="stepper" className={cn('flex items-center', className)} {...props}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
        const isLast = index === steps.length - 1;
        return (
          <li key={index} className={cn('flex items-center', !isLast && 'flex-1')}>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  state === 'done' && 'bg-primary text-primary-foreground',
                  state === 'current' && 'border-2 border-primary text-primary',
                  state === 'upcoming' && 'border border-border text-ink-4',
                )}
              >
                {state === 'done' ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-[12px] font-semibold',
                    state === 'upcoming' ? 'text-ink-4' : 'text-foreground',
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="truncate text-[10.5px] text-muted-foreground">{step.description}</p>
                )}
              </div>
            </div>
            {!isLast && (
              <div className={cn('mx-3 h-px flex-1', state === 'done' ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export { Stepper };

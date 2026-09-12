import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const scoreBadgeVariants = cva(
  'inline-flex min-w-[34px] items-center justify-center rounded-sm px-1.5 py-1 font-mono text-[11px] leading-none font-semibold',
  {
    variants: {
      tier: {
        hi: 'bg-accent text-primary',
        mid: 'bg-warning-soft text-warning',
        lo: 'bg-row-off text-destructive',
      },
    },
    defaultVariants: {
      tier: 'hi',
    },
  },
);

export interface ScoreBadgeProps
  extends Omit<React.ComponentProps<'span'>, 'children'>,
    VariantProps<typeof scoreBadgeVariants> {
  score: React.ReactNode;
}

/**
 * El tier (hi/mid/lo) se recibe como prop, nunca se infiere con umbrales
 * propios: el número y su clasificación vienen siempre del motor (RN-17/RN-18).
 */
function ScoreBadge({ className, tier, score, ...props }: ScoreBadgeProps) {
  return (
    <span className={cn(scoreBadgeVariants({ tier, className }))} {...props}>
      {score}
    </span>
  );
}

export { ScoreBadge, scoreBadgeVariants };

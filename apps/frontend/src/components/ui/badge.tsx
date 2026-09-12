import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] leading-none font-semibold',
  {
    variants: {
      variant: {
        ok: 'bg-accent text-accent-foreground',
        solid: 'bg-primary text-primary-foreground',
        warn: 'bg-warning-soft text-warning',
        danger: 'bg-destructive-soft text-destructive',
        neutral: 'border border-border text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };

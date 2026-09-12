import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[12.5px] font-semibold leading-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:border-border-soft disabled:bg-transparent disabled:text-ink-4 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: 'border border-transparent bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-primary bg-card text-primary hover:bg-secondary',
        ghost: 'border border-border bg-card font-medium text-foreground hover:bg-muted',
        destructive: 'border border-transparent bg-destructive text-destructive-foreground hover:opacity-90',
        link: 'h-auto border-transparent p-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-4 py-[11px]',
        sm: 'px-3 py-2 text-xs',
        lg: 'px-5 py-3 text-sm',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-[12.5px] font-semibold leading-none transition-[background-color,transform,box-shadow] duration-200 outline-none hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:translate-y-0 disabled:border-border-soft disabled:bg-transparent disabled:text-ink-4 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          'border border-transparent bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgba(30,76,58,0.55)] hover:bg-primary-hover',
        secondary: 'border border-primary bg-card text-primary hover:bg-secondary',
        ghost: 'border border-border bg-card font-medium text-foreground hover:bg-muted',
        destructive: 'border border-transparent bg-destructive text-destructive-foreground hover:opacity-90',
        link: 'h-auto border-transparent p-0 text-primary underline-offset-4 hover:translate-y-0 hover:underline',
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

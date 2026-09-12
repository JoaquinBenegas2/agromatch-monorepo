import * as React from 'react';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FieldProps extends Omit<React.ComponentProps<'div'>, 'id'> {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
}

function Field({ className, label, htmlFor, hint, error, required, children, ...props }: FieldProps) {
  return (
    <div data-slot="field" className={cn('flex flex-col gap-1.5', className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-ink-4">{hint}</p>
      ) : null}
    </div>
  );
}

export { Field };

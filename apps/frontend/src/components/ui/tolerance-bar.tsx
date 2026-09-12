import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ToleranceBarProps extends React.ComponentProps<'div'> {
  value: number;
  min?: number;
  max?: number;
  /** Marca un límite de tolerancia sobre la barra (ej. desvío máximo aceptado). */
  limit?: number;
}

function toPercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function ToleranceBar({ className, value, min = 0, max = 100, limit, ...props }: ToleranceBarProps) {
  const fillPct = toPercent(value, min, max);
  const limitPct = limit !== undefined ? toPercent(limit, min, max) : undefined;

  return (
    <div
      data-slot="tolerance-bar"
      role="meter"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('relative h-2 w-full rounded-full bg-[#DEE3D1]', className)}
      {...props}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width: `${fillPct}%` }}
      />
      {limitPct !== undefined && (
        <div
          className="absolute -top-[3px] -bottom-[3px] w-0.5 bg-foreground"
          style={{ left: `${limitPct}%` }}
        />
      )}
    </div>
  );
}

export { ToleranceBar };

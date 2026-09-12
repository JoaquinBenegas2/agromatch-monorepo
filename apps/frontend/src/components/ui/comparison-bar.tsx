import * as React from 'react';

import { cn } from '@/lib/utils';

export type ComparisonDirection = 'higher-is-better' | 'lower-is-better';

export interface ComparisonBarProps extends React.ComponentProps<'div'> {
  label: React.ReactNode;
  /** Valor de referencia (ej. la madre). */
  from: number;
  /** Valor esperado (ej. la cría F1). Siempre calculado por el núcleo genético, nunca por la UI. */
  to: number;
  min: number;
  max: number;
  direction: ComparisonDirection;
  format?: (value: number) => React.ReactNode;
}

function toPercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/**
 * BarraComparativa: cría esperada vs. la madre (o cualquier valor contra su
 * referencia), con dirección explícita porque en SCS y RFI menos es mejor.
 * El "mejora/empeora" es una comparación aritmética de los dos números que
 * ya vinieron del motor, no un juicio nuevo que invente la UI.
 */
function ComparisonBar({
  className,
  label,
  from,
  to,
  min,
  max,
  direction,
  format = (v) => v,
  ...props
}: ComparisonBarProps) {
  const fromPct = toPercent(from, min, max);
  const toPct = toPercent(to, min, max);
  const improves = direction === 'higher-is-better' ? to > from : to < from;

  return (
    <div data-slot="comparison-bar" className={cn('flex flex-col gap-1.5', className)} {...props}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {format(from)} → {format(to)}{' '}
          <span className={improves ? 'text-primary' : 'text-destructive'}>
            {improves ? 'mejora' : 'empeora'}
          </span>
        </span>
      </div>
      <div className="relative h-2 w-full rounded-sm bg-[#ECECEB]">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-sm', improves ? 'bg-primary' : 'bg-destructive')}
          style={{ width: `${toPct}%` }}
        />
        <div
          className="absolute -top-[3px] -bottom-[3px] w-0.5 bg-foreground"
          style={{ left: `${fromPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export { ComparisonBar };

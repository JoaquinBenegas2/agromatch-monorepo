import * as React from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface StarRatingProps extends React.ComponentProps<'div'> {
  /** Promedio 0-5 (misma escala que ReviewForm, RN-36). */
  value: number;
  jobs?: number;
}

/** Reputación como estrellas: nunca un número solo, siempre visualmente clara. */
function StarRating({ value, jobs, className, ...props }: StarRatingProps) {
  const filled = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <div className={cn('flex items-center gap-1.5', className)} {...props}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn('size-3.5', index < filled ? 'fill-warning text-warning' : 'fill-none text-border')}
            strokeWidth={1.5}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">
        {value.toFixed(1)}
        {jobs !== undefined ? ` · ${jobs} ${jobs === 1 ? 'trabajo' : 'trabajos'}` : ''}
      </span>
    </div>
  );
}

export { StarRating };

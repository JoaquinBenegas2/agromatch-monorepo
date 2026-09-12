import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface OfferCardStat {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface OfferCardProps extends Omit<React.ComponentProps<typeof Card>, 'title'> {
  /** Foto 16:9. Si no hay foto real, no se inventa una: se omite el slot. */
  image?: React.ReactNode;
  title: React.ReactNode;
  /** Central, cabaña o vendedor. */
  subtitle?: React.ReactNode;
  /** BadgeEstado / etiquetas (verificado, tier, A2_NUCLEUS, etc.). */
  badges?: React.ReactNode;
  /** Ranking relativo dentro del catálogo. Nunca una probabilidad (RN-15). */
  rank?: { position: number; total: number };
  /** Como mucho 2 datos clave. */
  stats?: OfferCardStat[];
  price?: React.ReactNode;
  /** Slot para <AiExplanation />, si esta pantalla la necesita. */
  explanation?: React.ReactNode;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

/**
 * TarjetaOferta: la misma base para los resultados de una necesidad y para
 * el swipe de toros. Título + badges + ranking + desglose + una acción.
 */
function OfferCard({
  className,
  image,
  title,
  subtitle,
  badges,
  rank,
  stats,
  price,
  explanation,
  primaryAction,
  secondaryAction,
  ...props
}: OfferCardProps) {
  return (
    <Card data-slot="offer-card" className={cn('flex flex-col overflow-hidden', className)} {...props}>
      {image && <div className="aspect-video w-full overflow-hidden bg-muted">{image}</div>}

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15.5px] leading-tight font-bold tracking-tight">{title}</p>
            {subtitle && <p className="truncate text-[11.5px] text-muted-foreground">{subtitle}</p>}
          </div>
          {rank && (
            <span className="inline-flex shrink-0 items-center rounded-sm bg-accent px-2 py-1 text-[11px] font-semibold text-primary">
              #{rank.position} de {rank.total}
            </span>
          )}
        </div>

        {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}

        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3 border-t border-border-soft pt-3">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col gap-0.5">
                <span className="text-[10.5px] text-muted-foreground">{stat.label}</span>
                <span className="text-[12.5px] font-semibold text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {price && (
          <div className="flex items-center justify-between border-t border-border-soft pt-3">
            <span className="text-[10.5px] text-muted-foreground">Precio</span>
            <span className="text-[15px] font-bold text-foreground">{price}</span>
          </div>
        )}

        {explanation}

        <div className="flex items-center gap-2 pt-1">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </Card>
  );
}

export { OfferCard };

import * as React from 'react';
import { Award, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/ui/badge';

/**
 * N7 (definiciones de negocio): tres niveles visibles — No verificado,
 * Verificado y Con historial (trabajos ya valorados en la plataforma).
 * `pending` es una verificación en curso.
 */
export type VerificationStatus = 'history' | 'verified' | 'pending' | 'unverified';

const STATUS_COPY: Record<
  VerificationStatus,
  { label: string; variant: BadgeProps['variant']; icon: React.ComponentType<{ className?: string }> }
> = {
  history: { label: 'Con historial', variant: 'ok', icon: Award },
  verified: { label: 'Verificado', variant: 'ok', icon: ShieldCheck },
  pending: { label: 'Verificación pendiente', variant: 'warn', icon: Clock },
  unverified: { label: 'No verificado', variant: 'neutral', icon: ShieldAlert },
};

export interface VerificationBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: VerificationStatus;
}

/**
 * Regla de negocio (honestidad en la UI): un proveedor no verificado
 * siempre se muestra como tal, nunca se omite ni se disfraza. No inventar
 * otros estados fuera de los soportados.
 */
function VerificationBadge({ status, className, ...props }: VerificationBadgeProps) {
  const { label, variant, icon: Icon } = STATUS_COPY[status];
  return (
    <Badge variant={variant} className={className} {...props}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

export { VerificationBadge };

import * as React from 'react';
import { Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/ui/badge';

export type VerificationStatus = 'verified' | 'pending' | 'unverified';

const STATUS_COPY: Record<
  VerificationStatus,
  { label: string; variant: BadgeProps['variant']; icon: React.ComponentType<{ className?: string }> }
> = {
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
 * otros estados fuera de los tres soportados.
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

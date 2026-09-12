import { Compass, MapPin, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import { VersionTag } from '@/components/ui/version-tag';
import { useMe } from '../../shared/api/hooks/use-me.js';

/** REQ-FS-08: tabs "pendiente" son placeholders honestos, sin llamadas a la API. */
export function PendingPlaceholder({ label }: { label: string }) {
  return (
    <EmptyState
      icon={<Compass />}
      title={
        <span className="inline-flex items-center gap-2">
          {label} <VersionTag>pendiente</VersionTag>
        </span>
      }
      description="Hoja de ruta: todavía no forma parte del MVP."
    />
  );
}

/** Pantalla real de otro flujo, no implementada en esta base (T0). */
export function NotImplementedPlaceholder({ label, spec }: { label: string; spec?: string }) {
  return (
    <EmptyState
      icon={<Compass />}
      title={label}
      description={
        spec
          ? `Esta pantalla la implementa la spec "${spec}". Todavía no está construida.`
          : 'Esta pantalla todavía no está construida.'
      }
    />
  );
}

/** REQ-FS-03: un FARMER que entra a la ruta del asesor ve una explicación, no un error. */
export function ForbiddenTabPlaceholder() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<ShieldAlert />}
      title="Esta pantalla es del asesor"
      description="El Panel del asesor está disponible solo para cuentas de tipo asesor o administrador."
      action={
        <Button variant="secondary" onClick={() => navigate('/motor-genetico/tablero')}>
          Ir al Tablero del rodeo
        </Button>
      }
    />
  );
}

/** REQ-FS-08: "Setup conversacional" muestra el nombre del tambo de GET /me. */
export function EstablecimientoPlaceholder() {
  const { data, isLoading, isError, error } = useMe();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError) return <ErrorMessage message={(error as Error).message} />;

  const farmName = data?.farms[0]?.name ?? 'tu establecimiento';
  return (
    <EmptyState
      icon={<MapPin />}
      title={
        <span className="inline-flex items-center gap-2">
          {farmName} <VersionTag>pendiente</VersionTag>
        </span>
      }
      description="El setup conversacional es hoja de ruta: todavía no forma parte del MVP."
    />
  );
}

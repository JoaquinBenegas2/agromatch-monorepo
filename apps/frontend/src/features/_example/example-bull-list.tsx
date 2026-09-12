import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import { useBulls } from '../../shared/api/hooks/use-bulls.js';

/**
 * Patrón de referencia (REQ-FS-06): los cuatro estados obligatorios de toda
 * pantalla que consume la API — cargando, error, vacío y con datos — sin
 * lógica de negocio. Copiá este archivo para armar una pantalla nueva.
 */
export function ExampleBullList() {
  const { data: bulls, isLoading, isError, error } = useBulls();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage message={(error as Error).message} />;
  }

  if (!bulls || bulls.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Todavía no hay toros cargados en el catálogo."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {bulls.map((bull) => (
        <li key={bull.naab} className="rounded-md border border-border bg-card px-3 py-2 text-[12.5px]">
          {bull.name} — {bull.naab}
        </li>
      ))}
    </ul>
  );
}

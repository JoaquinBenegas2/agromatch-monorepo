import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Catch-all de React Router: una URL que no existe muestra un mensaje y una
 * salida, nunca una pantalla en blanco ("No routes matched location").
 */
export function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <EmptyState
      icon={<Compass />}
      title="Esta página no existe"
      description={`No hay nada en ${pathname}. Volvé al mercado o elegí un módulo del menú.`}
      action={
        <Button size="sm" asChild>
          <Link to="/mercado">Ir al mercado</Link>
        </Button>
      }
    />
  );
}

import { useLocation } from 'react-router-dom';
import { useActiveFarmId, useUser } from '../../shared/user/user-context.js';
import { HerdImportPage } from '../../features/herd-import/herd-import-page.js';
import { HerdPage } from '../../features/herd/herd-page.js';
import { findTabByPath } from './nav.js';
import {
  EstablecimientoPlaceholder,
  ForbiddenTabPlaceholder,
  NotImplementedPlaceholder,
  PendingPlaceholder,
} from './placeholders.js';

/**
 * Renderiza el contenido de la tab activa según `nav.ts`. Las tabs `live`
 * con ruta propia (mercado, matching, asesor, plan) las resuelve `app.tsx`
 * antes de llegar acá; las de `/motor-genetico/*` sin ruta propia se montan
 * abajo, y el resto muestra su placeholder honesto.
 */
export function ModulePage() {
  const { pathname } = useLocation();
  const { user } = useUser();
  const [farmId] = useActiveFarmId();
  const tab = findTabByPath(pathname);

  if (!tab) return null;

  if (tab.roles && !tab.roles.includes(user.role)) {
    return <ForbiddenTabPlaceholder />;
  }
  if (pathname.startsWith('/motor-genetico/importar') && farmId) return <HerdImportPage farmId={farmId} />;
  if (pathname.startsWith('/motor-genetico/tablero') && farmId) return <HerdPage farmId={farmId} />;

  switch (tab.status) {
    case 'pending':
      return <PendingPlaceholder label={tab.label} />;
    case 'placeholder-with-data':
      return <EstablecimientoPlaceholder />;
    default:
      return <NotImplementedPlaceholder label={tab.label} spec={tab.spec} />;
  }
}

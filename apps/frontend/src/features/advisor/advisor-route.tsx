import { ForbiddenTabPlaceholder } from '../../app/shell/placeholders.js';
import { useUser } from '../../shared/user/user-context.js';
import { AdvisorPage } from './advisor-page.js';

/** REQ-FS-03: la pantalla real del asesor, gateada por rol también fuera del tab bar. */
export function AdvisorRoute() {
  const { user } = useUser();
  if (user.role !== 'ADVISOR' && user.role !== 'ADMIN') return <ForbiddenTabPlaceholder />;
  return <AdvisorPage />;
}

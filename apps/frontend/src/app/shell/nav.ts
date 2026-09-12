import type { Role } from '@org/shared-types';

/**
 * `live`: la pantalla real está implementada y pega a la API.
 * `placeholder-with-data`: placeholder que muestra algún dato real.
 * `not-implemented`: hay spec pero no pantalla. `pending`: hoja de ruta.
 */
export type TabStatus =
  'live' | 'pending' | 'not-implemented' | 'placeholder-with-data';

export interface NavTab {
  label: string;
  path: string;
  status: TabStatus;
  /** Spec dueña de la pantalla real (para el placeholder "todavía no implementada"). */
  spec?: string;
  /** Si se define, la tab solo se renderiza para estos roles (REQ-FS-03). */
  roles?: Role[];
}

export interface NavModule {
  id: string;
  label: string;
  subtitle: string;
  tabs: NavTab[];
}

/** Mapa de navegación (REQ-FS-01): exactamente 5 módulos, tabs adentro. */
export const NAV_MODULES: NavModule[] = [
  {
    id: 'establecimiento',
    label: 'Mi establecimiento',
    subtitle: 'Tu lugar de trabajo',
    tabs: [
      {
        label: 'Setup conversacional',
        path: '/establecimiento',
        status: 'placeholder-with-data',
      },
    ],
  },
  {
    id: 'mercado',
    label: 'Mercado y oportunidades',
    subtitle: 'Encontrá quién lo resuelve',
    tabs: [
      {
        label: 'Home marketplace general',
        path: '/mercado',
        status: 'live',
        spec: 'mvp-b-need',
      },
    ],
  },
  {
    id: 'motor-genetico',
    label: 'Motor genético',
    subtitle: 'Decisiones para tu rodeo',
    tabs: [
      {
        label: 'Matching genético',
        path: '/motor-genetico/matching',
        status: 'live',
        spec: 'mvp-d-match',
      },
      {
        label: 'Tablero del rodeo',
        path: '/motor-genetico/tablero',
        status: 'live',
        spec: 'mvp-c-herd',
      },
      {
        label: 'Carga del rodeo',
        path: '/motor-genetico/importar',
        status: 'live',
        spec: 'mvp-c-herd',
      },
      {
        label: 'Panel del asesor',
        path: '/motor-genetico/asesor',
        status: 'live',
        spec: 'mvp-b-need',
        roles: ['ADVISOR', 'ADMIN'],
      },
    ],
  },
  {
    id: 'negociacion',
    label: 'Negociación y tratos',
    subtitle: 'Del encuentro a la acción',
    tabs: [
      {
        label: 'Mis matches / mensajes',
        path: '/negociacion/matches',
        status: 'live',
      },
      {
        label: 'Plan de servicios',
        path: '/negociacion/plan',
        status: 'live',
        spec: 'mvp-d-match',
      },
    ],
  },
  {
    id: 'ofertas',
    label: 'Mis ofertas',
    subtitle: 'Tu catálogo de servicios',
    tabs: [
      {
        label: 'Cargar lotes / servicios',
        path: '/ofertas',
        status: 'pending',
      },
    ],
  },
];

export function findModuleByPath(pathname: string): NavModule | undefined {
  return NAV_MODULES.find((mod) =>
    mod.tabs.some((tab) => pathname.startsWith(tab.path)),
  );
}

export function findTabByPath(pathname: string): NavTab | undefined {
  for (const mod of NAV_MODULES) {
    const tab = mod.tabs.find((t) => pathname.startsWith(t.path));
    if (tab) return tab;
  }
  return undefined;
}

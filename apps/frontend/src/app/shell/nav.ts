import type { Role } from '@org/shared-types';

export type TabStatus = 'pending' | 'not-implemented' | 'placeholder-with-data';

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
    subtitle: 'valor / setup',
    tabs: [
      { label: 'Setup conversacional', path: '/establecimiento', status: 'placeholder-with-data' },
    ],
  },
  {
    id: 'mercado',
    label: 'Mercado y oportunidades',
    subtitle: 'mercado general',
    tabs: [
      {
        label: 'Home marketplace general',
        path: '/mercado',
        status: 'not-implemented',
        spec: 'mvp-b-need',
      },
    ],
  },
  {
    id: 'motor-genetico',
    label: 'Motor genético',
    subtitle: 'motor técnico',
    tabs: [
      {
        label: 'Matching genético',
        path: '/motor-genetico/matching',
        status: 'not-implemented',
        spec: 'mvp-d-match',
      },
      {
        label: 'Tablero del rodeo',
        path: '/motor-genetico/tablero',
        status: 'placeholder-with-data',
      },
      {
        label: 'Carga del rodeo',
        path: '/motor-genetico/importar',
        status: 'placeholder-with-data',
      },
      {
        label: 'Panel del asesor',
        path: '/motor-genetico/asesor',
        status: 'not-implemented',
        spec: 'mvp-b-need',
        roles: ['ADVISOR', 'ADMIN'],
      },
    ],
  },
  {
    id: 'negociacion',
    label: 'Negociación y tratos',
    subtitle: 'transacciones',
    tabs: [
      { label: 'Mis matches / mensajes', path: '/negociacion/matches', status: 'pending' },
      {
        label: 'Plan de servicios',
        path: '/negociacion/plan',
        status: 'not-implemented',
        spec: 'mvp-d-match',
      },
    ],
  },
  {
    id: 'ofertas',
    label: 'Mis ofertas',
    subtitle: 'catálogo propio',
    tabs: [{ label: 'Cargar lotes / servicios', path: '/ofertas', status: 'pending' }],
  },
];

export function findModuleByPath(pathname: string): NavModule | undefined {
  return NAV_MODULES.find((mod) => mod.tabs.some((tab) => pathname.startsWith(tab.path)));
}

export function findTabByPath(pathname: string): NavTab | undefined {
  for (const mod of NAV_MODULES) {
    const tab = mod.tabs.find((t) => pathname.startsWith(t.path));
    if (tab) return tab;
  }
  return undefined;
}

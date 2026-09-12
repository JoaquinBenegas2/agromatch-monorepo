import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { App } from './app';
import { UserProvider } from '../shared/user/user-context';

/**
 * REQ-FS-01: recorre las 10 rutas de la tabla *Mapa de navegación* como
 * `asesor-1` y `tambero-a`, sustituyendo la verificación manual en
 * navegador (no disponible en este entorno de ejecución) por un recorrido
 * automatizado equivalente: cada ruta debe montar sin lanzar, sin pedir
 * datos por red real (fetch mockeado) y el sidebar debe listar siempre
 * exactamente 5 módulos.
 */
const ROUTES = [
  '/',
  '/establecimiento',
  '/mercado',
  '/motor-genetico/matching',
  '/motor-genetico/tablero',
  '/motor-genetico/importar',
  '/motor-genetico/asesor',
  '/negociacion/matches',
  '/negociacion/plan',
  '/ofertas',
];

const USERS = {
  'tambero-a': {
    user: {
      id: 'tambero-a',
      name: 'Tambero A',
      role: 'FARMER',
      farmIds: ['farm-a'],
    },
    farms: [
      {
        id: 'farm-a',
        name: 'Tambo A',
        location: 'Córdoba',
        tierQuotas: { sexedPct: 25, beefPct: 30 },
        calvingEaseMaxHeifer: 2.5,
        scsGrayZone: { from: 3.1, to: 3.18 },
        plGrayZone: { from: 0, to: 0.2 },
      },
    ],
  },
  'asesor-1': {
    user: {
      id: 'asesor-1',
      name: 'Asesor 1',
      role: 'ADVISOR',
      farmIds: ['farm-a', 'farm-b', 'farm-c'],
    },
    farms: [
      {
        id: 'farm-a',
        name: 'Tambo A',
        location: 'Córdoba',
        tierQuotas: { sexedPct: 25, beefPct: 30 },
        calvingEaseMaxHeifer: 2.5,
        scsGrayZone: { from: 3.1, to: 3.18 },
        plGrayZone: { from: 0, to: 0.2 },
      },
      {
        id: 'farm-b',
        name: 'Tambo B',
        location: 'Santa Fe',
        tierQuotas: { sexedPct: 25, beefPct: 30 },
        calvingEaseMaxHeifer: 2.5,
        scsGrayZone: { from: 3.1, to: 3.18 },
        plGrayZone: { from: 0, to: 0.2 },
      },
      {
        id: 'farm-c',
        name: 'Tambo C',
        location: 'Buenos Aires',
        tierQuotas: { sexedPct: 25, beefPct: 30 },
        calvingEaseMaxHeifer: 2.5,
        scsGrayZone: { from: 3.1, to: 3.18 },
        plGrayZone: { from: 0, to: 0.2 },
      },
    ],
  },
} as const;

function renderAt(path: string, userId: keyof typeof USERS) {
  window.localStorage.setItem('agromatch:userId', userId);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => USERS[userId] }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </UserProvider>
    </QueryClientProvider>,
  );
}

describe.each(['tambero-a', 'asesor-1'] as const)(
  'recorrido de rutas como %s',
  (userId) => {
    it.each(ROUTES)(
      '%s monta y mantiene acceso a los 5 módulos',
      async (path) => {
        const { baseElement, unmount } = renderAt(path, userId);
        const immersive = /^\/motor-genetico\/(matching|tablero|importar)/.test(
          path,
        );
        expect(baseElement.querySelector('[data-slot="sidebar"]')).toBeTruthy();
        if (immersive)
          expect(
            baseElement.querySelector('.genetics-experience'),
          ).toBeTruthy();
        const navItems = baseElement.querySelectorAll(
          '[data-slot="sidebar-nav-item"]',
        );
        expect(navItems.length).toBe(5);
        unmount();
      },
    );
  },
);

describe('REQ-FS-03: la tab del asesor', () => {
  it('un FARMER en /motor-genetico/asesor ve la explicación, no la pantalla real', () => {
    renderAt('/motor-genetico/asesor', 'tambero-a');
    expect(screen.getByText('Esta pantalla es del asesor')).toBeTruthy();
  });

  it('un ADVISOR en /motor-genetico/asesor no ve la explicación de rol', () => {
    renderAt('/motor-genetico/asesor', 'asesor-1');
    expect(screen.queryByText('Esta pantalla es del asesor')).toBeNull();
  });
});

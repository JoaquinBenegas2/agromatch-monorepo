import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { samples } from '@org/shared-types/fixtures';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserProvider } from '../../shared/user/user-context.js';
import { advisorHandlers } from '../../mocks/handlers/advisor.js';
import { AdvisorPage } from './advisor-page.js';

const server = setupServer(...advisorHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // El panel navega al tablero del tambo elegido: necesita router y usuario.
  return (
    <QueryClientProvider client={client}>
      <UserProvider>
        <MemoryRouter initialEntries={['/motor-genetico/asesor']}>
          <Routes>
            <Route path="/motor-genetico/asesor" element={children} />
            <Route path="/motor-genetico/tablero" element={<p>Tablero del tambo activo</p>} />
          </Routes>
        </MemoryRouter>
      </UserProvider>
    </QueryClientProvider>
  );
}

describe('AdvisorPage (REQ-B-ADV-02)', () => {
  beforeEach(() => window.localStorage.setItem('agromatch:userId', 'asesor-1'));

  it('muestra tres tarjetas y la comparación de rasgos con mocks', async () => {
    render(wrapper(<AdvisorPage />));

    expect((await screen.findAllByText('Tambo A (anonimizado)')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tambo B (demo sintético)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tambo C (demo sintético)').length).toBeGreaterThan(0);
    expect(screen.getByText('Comparación de rasgos promedio')).toBeTruthy();
    expect(screen.getByText('293')).toBeTruthy();
  });

  it('cada tambo se abre en su tablero (F7: del resumen a la acción)', async () => {
    render(wrapper(<AdvisorPage />));
    fireEvent.click(await screen.findByLabelText('Abrir el tablero de Tambo B (demo sintético)'));
    expect(await screen.findByText('Tablero del tambo activo')).toBeTruthy();
  });

  it('muestra el estado sin tambos', async () => {
    server.use(http.get('/api/advisor/overview', () => HttpResponse.json([])));
    render(wrapper(<AdvisorPage />));
    expect(await screen.findByText('Todavía no hay tambos asignados a tu cuenta')).toBeTruthy();
  });

  it('muestra el error real del backend', async () => {
    server.use(
      http.get('/api/advisor/overview', () =>
        HttpResponse.json({ code: 'ROLE_FORBIDDEN', message: 'Tu rol no tiene acceso a esta pantalla', details: {} }, { status: 403 }),
      ),
    );
    render(wrapper(<AdvisorPage />));
    expect(await screen.findByText('Tu rol no tiene acceso a esta pantalla')).toBeTruthy();
  });

  it('renderiza esqueletos mientras carga', () => {
    server.use(http.get('/api/advisor/overview', () => new Promise(() => undefined)));
    render(wrapper(<AdvisorPage />));
    expect(screen.getByLabelText('Cargando panel del asesor')).toBeTruthy();
  });

  it('muestra a viva voz cuando un rodeo no fue clasificado todavía', async () => {
    server.use(
      http.get('/api/advisor/overview', () =>
        HttpResponse.json([
          {
            farm: samples.farmSummaries[0]?.farm,
            total: 10,
            byTier: { ELITE: 0, COMMERCIAL: 0, BEEF: 0, CULL_ALERT: 0 },
            avgTraits: {},
            a2a2Share: 0,
            bbShare: 0,
          },
        ]),
      ),
    );
    render(wrapper(<AdvisorPage />));
    expect(await screen.findByText('Todavía no se clasificó este rodeo.')).toBeTruthy();
  });
});

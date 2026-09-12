import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { needsSamples } from '@org/shared-types/fixtures';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserProvider } from '../../shared/user/user-context.js';
import { needsHandlers } from '../../mocks/handlers/needs.js';
import { MarketplacePage } from './marketplace-page.js';
import { MarketResults } from './market-results.js';

const server = setupServer(...needsHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={client}>
      <UserProvider>
        <MemoryRouter initialEntries={['/mercado']}>
          <Routes>
            <Route path="/mercado" element={children} />
            <Route path="/motor-genetico/matching" element={<p>Matching genético dedicado</p>} />
          </Routes>
        </MemoryRouter>
      </UserProvider>
    </QueryClientProvider>
  );
}

describe('MarketplacePage', () => {
  beforeEach(() => window.localStorage.setItem('agromatch:userId', 'tambero-a'));

  it('empieza en cero sin crear una necesidad', () => {
    const requestUrls: string[] = [];
    server.events.on('request:start', ({ request }) => requestUrls.push(request.url));

    render(wrapper(<MarketplacePage />));

    expect(screen.getByText('¿Qué necesita tu establecimiento hoy?')).toBeTruthy();
    expect(screen.getByLabelText('Audio no disponible en este navegador')).toHaveProperty('disabled', true);
    expect(requestUrls.some((url) => url.endsWith('/api/needs'))).toBe(false);
  });

  it('busca directo, sin pantalla intermedia, y desbloquea el contacto al solicitar', async () => {
    render(wrapper(<MarketplacePage />));

    fireEvent.click(screen.getByText('Contratistas de arada cerca tuyo'));
    expect(screen.queryByText('Lo que AgroMatch entendió')).toBeNull();
    expect(await screen.findByText('Soluciones para tu necesidad')).toBeTruthy();
    expect(screen.getByText('Fecha deducida del texto')).toBeTruthy();
    expect(await screen.findByText('#1 de 7')).toBeTruthy();
    expect(screen.queryByText('+54 9 3537 424031')).toBeNull();

    const matchRequestsBefore = performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/matches')).length;
    fireEvent.click(screen.getByText('Menor precio/ha'));
    const matchRequestsAfter = performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/matches')).length;
    expect(matchRequestsAfter).toBe(matchRequestsBefore);
    expect(screen.getByText('#1 de 7')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Pedir fecha')[0]);
    fireEvent.change(screen.getByLabelText('Mensaje para el proveedor'), {
      target: { value: 'Quiero coordinar disponibilidad y condiciones.' },
    });
    fireEvent.click(screen.getByText('Enviar solicitud'));

    expect(await screen.findByText('+54 9 3537 424031')).toBeTruthy();
    expect(screen.getByText('Solicitud enviada')).toBeTruthy();
    expect(screen.getByText('Ver solicitud · Valorar')).toBeTruthy();

    // N4: la reseña cierra el ciclo desde la misma solicitud.
    fireEvent.click(screen.getByLabelText('4 de 5'));
    fireEvent.change(screen.getByLabelText('Comentario de la valoración'), {
      target: { value: 'Cumplió la fecha.' },
    });
    fireEvent.click(screen.getByText('Enviar valoración'));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Valoración enviada'));
  });

  it('deriva genética al motor dedicado sin mostrar resultados genéricos', async () => {
    render(wrapper(<MarketplacePage />));

    fireEvent.click(screen.getByText('Mejorar los sólidos de mi tambo'));

    expect(await screen.findByText('Matching genético dedicado')).toBeTruthy();
    expect(screen.queryByText('Soluciones para tu necesidad')).toBeNull();
  });

  it('muestra el error real de interpretación', async () => {
    render(wrapper(<MarketplacePage />));

    fireEvent.change(screen.getByLabelText('Necesidad'), { target: { value: '[error]' } });
    fireEvent.click(screen.getByText('Preguntar'));

    expect(
      await screen.findByText('El asistente de interpretación no está disponible'),
    ).toBeTruthy();
  });
});

describe('MarketResults states', () => {
  const firstSample = needsSamples[0];
  if (!firstSample) throw new Error('Falta el fixture de necesidad de maquinaria');
  const need = firstSample.need;

  it('renderiza el estado sin proveedores', () => {
    render(
      <MarketResults
        need={need}
        board={{ ranked: [], excluded: [] }}
        providers={[]}
        providersLoading={false}
        requesting={false}
        reviewing={false}
        onEdit={() => undefined}
        onRequest={() => Promise.reject(new Error('No se usa'))}
        onReview={() => Promise.reject(new Error('No se usa'))}
      />,
    );
    expect(screen.getByText('Todavía no hay proveedores para esta categoría')).toBeTruthy();
  });

  it('renderiza esqueletos mientras carga proveedores', () => {
    render(
      <MarketResults
        need={need}
        board={{ ranked: [], excluded: [] }}
        providersLoading
        requesting={false}
        reviewing={false}
        onEdit={() => undefined}
        onRequest={() => Promise.reject(new Error('No se usa'))}
        onReview={() => Promise.reject(new Error('No se usa'))}
      />,
    );
    expect(screen.getByLabelText('Cargando proveedores')).toBeTruthy();
  });
});

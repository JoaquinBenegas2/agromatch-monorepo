import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import App from './app';
import { UserProvider } from '../shared/user/user-context';

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UserProvider>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 'tambero-a', name: 'Tambero A', role: 'FARMER', farmIds: ['farm-a'] },
          farms: [],
        }),
      }),
    );
  });

  it('should render successfully', () => {
    const { baseElement } = renderApp();
    expect(baseElement).toBeTruthy();
  });

  it('muestra el sidebar con exactamente 5 módulos (REQ-FS-01)', () => {
    renderApp();
    for (const label of [
      'Mi establecimiento',
      'Mercado y oportunidades',
      'Motor genético',
      'Negociación y tratos',
      'Mis ofertas',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('redirige / a /mercado', () => {
    renderApp();
    expect(window.location.pathname).toBe('/mercado');
  });
});

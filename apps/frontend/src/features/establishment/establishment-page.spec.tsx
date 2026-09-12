import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { UserProvider } from '../../shared/user/user-context';
import { EstablishmentPage } from './establishment-page';

const ME_RESPONSE = {
  user: { id: 'tambero-a', name: 'Tambero A', role: 'FARMER', farmIds: ['farm-a'] },
  farms: [{
    id: 'farm-a',
    name: 'Tambo A (anonimizado)',
    location: 'Cuenca lechera de Córdoba (demo)',
    tierQuotas: { sexedPct: 25, beefPct: 30 },
    calvingEaseMaxHeifer: 2.5,
    scsGrayZone: { from: 3.1, to: 3.18 },
    plGrayZone: { from: 0, to: 0.2 },
  }],
};

function renderPage() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ME_RESPONSE }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider><EstablishmentPage /></UserProvider>
    </QueryClientProvider>,
  );
}

describe('EstablishmentPage', () => {
  it('muestra el perfil mockeado y ambos modos de participación', async () => {
    renderPage();
    expect(await screen.findByText('Tambo A (anonimizado)')).toBeTruthy();
    expect(screen.getByText('Solicito soluciones')).toBeTruthy();
    expect(screen.getByText('Ofrezco productos o servicios')).toBeTruthy();
    expect(screen.getByText('Perfil solicitante')).toBeTruthy();
    expect(screen.getByText('Perfil proveedor')).toBeTruthy();
    expect(screen.getByText('Tambo La Esperanza SRL')).toBeTruthy();
  });
});

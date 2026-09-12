import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProvider } from '../../shared/user/user-context.js';
import NegotiationsPage from './negotiations-page.js';

const negotiation = {
  id: 'request-1', needId: 'need-1', providerId: 'prov-mainero', providerName: 'Mainero',
  farmId: 'farm-a', farmName: 'Tambo A', subject: 'Arar 40 ha', category: 'MACHINERY',
  status: 'ANSWERED', createdAt: '2026-09-12T18:00:00.000Z', updatedAt: '2026-09-12T18:05:00.000Z',
  messages: [
    { id: 'm1', serviceRequestId: 'request-1', senderUserId: 'tambero-a', senderName: 'Tambero A', senderType: 'CUSTOMER', body: '¿Qué fecha tienen?', createdAt: '2026-09-12T18:00:00.000Z' },
    { id: 'm2', serviceRequestId: 'request-1', senderUserId: 'proveedor-mainero', senderName: 'Mainero', senderType: 'PROVIDER', body: 'Podemos el martes.', createdAt: '2026-09-12T18:05:00.000Z' },
  ],
};

function wrapper() {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <UserProvider>
        <MemoryRouter initialEntries={['/negociacion/matches/request-1']}>
          <Routes><Route path="/negociacion/matches/:id" element={<NegotiationsPage />} /></Routes>
        </MemoryRouter>
      </UserProvider>
    </QueryClientProvider>
  );
}

describe('NegotiationsPage', () => {
  beforeEach(() => {
    window.localStorage.setItem('agromatch:userId', 'tambero-a');
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.method === 'POST'
        ? { ...negotiation, messages: [...negotiation.messages, { id: 'm3', serviceRequestId: 'request-1', senderUserId: 'tambero-a', senderName: 'Tambero A', senderType: 'CUSTOMER', body: 'Perfecto.', createdAt: '2026-09-12T18:06:00.000Z' }] }
        : [negotiation];
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
  });

  it('muestra el hilo persistido y envía una respuesta', async () => {
    render(wrapper());
    expect(await screen.findByText('Podemos el martes.')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Escribí un mensaje…'), { target: { value: 'Perfecto.' } });
    fireEvent.click(screen.getByLabelText('Enviar mensaje'));
    expect(await screen.findByText('Perfecto.')).toBeTruthy();
  });
});

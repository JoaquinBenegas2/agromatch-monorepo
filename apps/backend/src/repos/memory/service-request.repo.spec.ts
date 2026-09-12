import type { ServiceRequest } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import { InMemoryServiceRequestRepo } from './service-request.repo.js';

describe('InMemoryServiceRequestRepo', () => {
  const request: ServiceRequest = {
    id: 'req-1',
    needId: 'need-1',
    providerId: 'provider-1',
    message: 'hola',
    status: 'SENT',
    createdAt: new Date().toISOString(),
    contact: { phone: '123' },
  };

  it('create guarda y findById lo devuelve', async () => {
    const repo = new InMemoryServiceRequestRepo(new MemoryStore());

    await repo.create(request);

    await expect(repo.findById('req-1')).resolves.toEqual(request);
  });

  it('findById devuelve null si no existe', async () => {
    const repo = new InMemoryServiceRequestRepo(new MemoryStore());

    await expect(repo.findById('no-existe')).resolves.toBeNull();
  });
});

import { capabilities, providers } from '@org/shared-types/fixtures';
import { MemoryStore } from './memory-store.js';
import { InMemoryProviderRepo } from './provider.repo.js';

describe('InMemoryProviderRepo', () => {
  it('list sin filtro devuelve todos los proveedores sembrados', async () => {
    const repo = new InMemoryProviderRepo(new MemoryStore());

    const result = await repo.list();

    expect(result).toHaveLength(providers.length);
  });

  it('list con category filtra por la categoría de sus capabilities', async () => {
    const repo = new InMemoryProviderRepo(new MemoryStore());
    const category = capabilities[0].category;
    const expectedIds = new Set(
      capabilities.filter((c) => c.category === category).map((c) => c.providerId),
    );

    const result = await repo.list({ category });

    expect(new Set(result.map((p) => p.id))).toEqual(expectedIds);
  });

  it('findById encuentra un proveedor sembrado', async () => {
    const repo = new InMemoryProviderRepo(new MemoryStore());

    const provider = await repo.findById(providers[0].id);

    expect(provider?.id).toBe(providers[0].id);
  });

  it('findById devuelve null si no existe', async () => {
    const repo = new InMemoryProviderRepo(new MemoryStore());

    await expect(repo.findById('no-existe')).resolves.toBeNull();
  });

  it('listCapabilities filtra por categoría', async () => {
    const repo = new InMemoryProviderRepo(new MemoryStore());
    const category = capabilities[0].category;

    const result = await repo.listCapabilities({ category });

    expect(result.every((c) => c.category === category)).toBe(true);
    expect(result.length).toBe(capabilities.filter((c) => c.category === category).length);
  });

  it('updateReputation actualiza y devuelve el proveedor', async () => {
    const repo = new InMemoryProviderRepo(new MemoryStore());
    const id = providers[0].id;

    const updated = await repo.updateReputation(id, { avg: 4.5, jobs: 2 });

    expect(updated.reputation).toEqual({ avg: 4.5, jobs: 2 });
    const reread = await repo.findById(id);
    expect(reread?.reputation).toEqual({ avg: 4.5, jobs: 2 });
  });

  it('updateReputation lanza si el proveedor no existe', async () => {
    const repo = new InMemoryProviderRepo(new MemoryStore());

    await expect(repo.updateReputation('no-existe', { avg: 1, jobs: 1 })).rejects.toThrow();
  });
});

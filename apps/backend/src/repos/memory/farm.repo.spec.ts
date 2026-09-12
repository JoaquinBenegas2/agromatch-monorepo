import { MemoryStore } from './memory-store.js';
import { InMemoryFarmRepo } from './farm.repo.js';

describe('InMemoryFarmRepo', () => {
  it('findById encuentra un tambo sembrado', async () => {
    const repo = new InMemoryFarmRepo(new MemoryStore());

    const farm = await repo.findById('farm-a');

    expect(farm?.name).toBe('Tambo A (anonimizado)');
  });

  it('findById devuelve null si no existe', async () => {
    const repo = new InMemoryFarmRepo(new MemoryStore());

    await expect(repo.findById('no-existe')).resolves.toBeNull();
  });

  it('findByIds devuelve solo los tambos pedidos', async () => {
    const repo = new InMemoryFarmRepo(new MemoryStore());

    const farms = await repo.findByIds(['farm-a', 'farm-c', 'no-existe']);

    expect(farms.map((f) => f.id).sort()).toEqual(['farm-a', 'farm-c']);
  });

  it('findByIds con lista vacía devuelve vacío', async () => {
    const repo = new InMemoryFarmRepo(new MemoryStore());

    await expect(repo.findByIds([])).resolves.toEqual([]);
  });
});

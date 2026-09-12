import { bullsSeed } from '@org/shared-types/fixtures';
import { MemoryStore } from './memory-store.js';
import { InMemoryBullRepo } from './bull.repo.js';

describe('InMemoryBullRepo', () => {
  it('list devuelve el catálogo sembrado completo', async () => {
    const repo = new InMemoryBullRepo(new MemoryStore());

    const bulls = await repo.list();

    expect(bulls).toHaveLength(bullsSeed.length);
  });

  it('findByNaab encuentra un toro sembrado', async () => {
    const repo = new InMemoryBullRepo(new MemoryStore());
    const naab = bullsSeed[0].naab;

    const bull = await repo.findByNaab(naab);

    expect(bull?.naab).toBe(naab);
  });

  it('findByNaab devuelve null si no existe', async () => {
    const repo = new InMemoryBullRepo(new MemoryStore());

    await expect(repo.findByNaab('NO-EXISTE')).resolves.toBeNull();
  });

  it('upsertMany agrega toros nuevos y cuenta como added', async () => {
    const repo = new InMemoryBullRepo(new MemoryStore());
    const nuevo = {
      naab: '999TEST01',
      name: 'Test Bull',
      company: 'Test Co',
      breed: 'HOLSTEIN' as const,
      profile: null,
      sireNaab: null,
      calvingEase: null,
      semenTypes: ['CONVENTIONAL' as const],
      pricePerDose: 10,
      source: 'test',
    };

    const result = await repo.upsertMany([nuevo]);

    expect(result).toEqual({ added: 1, updated: 0 });
    await expect(repo.findByNaab('999TEST01')).resolves.toEqual(nuevo);
  });

  it('upsertMany actualiza un toro existente y cuenta como updated', async () => {
    const repo = new InMemoryBullRepo(new MemoryStore());
    const existing = (await repo.list())[0];
    const updated = { ...existing, name: 'Nombre actualizado' };

    const result = await repo.upsertMany([updated]);

    expect(result).toEqual({ added: 0, updated: 1 });
    await expect(repo.findByNaab(existing.naab)).resolves.toMatchObject({ name: 'Nombre actualizado' });
  });
});

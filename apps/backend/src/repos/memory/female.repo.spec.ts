import type { Female } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import { InMemoryFemaleRepo } from './female.repo.js';

describe('InMemoryFemaleRepo', () => {
  it('listByFarm devuelve las 293 hembras del rodeo real de farm-a', async () => {
    const repo = new InMemoryFemaleRepo(new MemoryStore());

    const females = await repo.listByFarm('farm-a');

    expect(females).toHaveLength(293);
  });

  it('una farm no ve las hembras de otra', async () => {
    const repo = new InMemoryFemaleRepo(new MemoryStore());

    const farmAFemales = await repo.listByFarm('farm-a');
    const farmBFemales = await repo.listByFarm('farm-b');

    const farmAIds = new Set(farmAFemales.map((f) => f.id));
    expect(farmBFemales.some((f) => farmAIds.has(f.id))).toBe(false);
  });

  it('findById encuentra una hembra dentro de su tambo (visualId de texto, ej. caravanas C-xxx)', async () => {
    const repo = new InMemoryFemaleRepo(new MemoryStore());
    const [sample] = await repo.listByFarm('farm-a');

    const found = await repo.findById('farm-a', sample.id);

    expect(found?.id).toBe(sample.id);
  });

  it('findById devuelve null si la hembra es de otro tambo', async () => {
    const repo = new InMemoryFemaleRepo(new MemoryStore());
    const [sample] = await repo.listByFarm('farm-a');

    await expect(repo.findById('farm-b', sample.id)).resolves.toBeNull();
  });

  it('upsertMany crea hembras nuevas para el tambo', async () => {
    const repo = new InMemoryFemaleRepo(new MemoryStore());
    const nueva: Female = {
      id: 'f-test-1',
      farmId: 'farm-a',
      visualId: 'TEST-1',
      birthDate: '2020-01-01',
      sireNaab: null,
      category: 'VACA',
      profile: null,
    };

    const count = await repo.upsertMany('farm-a', [...(await repo.listByFarm('farm-a')), nueva]);

    expect(count).toBe(294);
    await expect(repo.findById('farm-a', 'f-test-1')).resolves.toEqual(nueva);
  });

  it('upsertMany borra las hembras del tambo que ya no vienen en la lista (por visualId)', async () => {
    const repo = new InMemoryFemaleRepo(new MemoryStore());
    const current = await repo.listByFarm('farm-a');
    const withoutFirst = current.slice(1);

    const count = await repo.upsertMany('farm-a', withoutFirst);

    expect(count).toBe(withoutFirst.length);
    const after = await repo.listByFarm('farm-a');
    expect(after).toHaveLength(withoutFirst.length);
    expect(after.some((f) => f.visualId === current[0].visualId)).toBe(false);
  });

  it('upsertMany sobre un visualId existente actualiza campos y conserva el id original', async () => {
    const repo = new InMemoryFemaleRepo(new MemoryStore());
    const [existing] = await repo.listByFarm('farm-a');
    const changed: Female = { ...existing, id: 'un-id-distinto', category: 'VAQUILLONA' };

    await repo.upsertMany('farm-a', [changed, ...(await repo.listByFarm('farm-a')).slice(1)]);

    const reread = await repo.findById('farm-a', existing.id);
    expect(reread?.category).toBe('VAQUILLONA');
    expect(reread?.visualId).toBe(existing.visualId);
    await expect(repo.findById('farm-a', 'un-id-distinto')).resolves.toBeNull();
  });
});

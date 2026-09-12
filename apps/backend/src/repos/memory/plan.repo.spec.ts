import { MemoryStore } from './memory-store.js';
import { InMemoryPlanRepo } from './plan.repo.js';

describe('InMemoryPlanRepo', () => {
  it('getOrCreate crea un plan vacío la primera vez', async () => {
    const repo = new InMemoryPlanRepo(new MemoryStore());

    const plan = await repo.getOrCreate('farm-a');

    expect(plan.farmId).toBe('farm-a');
    expect(plan.items).toEqual([]);
    expect(plan.totals).toEqual({ doses: { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 }, cost: 0, avgExpectedProgeny: {} });
    expect(plan.id).toEqual(expect.any(String));
  });

  it('getOrCreate devuelve el mismo plan en la segunda llamada (mismo id)', async () => {
    const repo = new InMemoryPlanRepo(new MemoryStore());

    const first = await repo.getOrCreate('farm-a');
    const second = await repo.getOrCreate('farm-a');

    expect(second.id).toBe(first.id);
  });

  it('save persiste los items y totales nuevos', async () => {
    const repo = new InMemoryPlanRepo(new MemoryStore());
    const plan = await repo.getOrCreate('farm-a');

    const updated = await repo.save({
      ...plan,
      items: [{ femaleId: 'f-1', bullNaab: 'X', semenType: 'SEXED', compatibility: 100, pricePerDose: 5 }],
      totals: { doses: { SEXED: 1, CONVENTIONAL: 0, BEEF: 0 }, cost: 5, avgExpectedProgeny: {} },
    });

    expect(updated.items).toHaveLength(1);
    const reread = await repo.getOrCreate('farm-a');
    expect(reread.items).toHaveLength(1);
    expect(reread.id).toBe(plan.id);
  });

  it('cada tambo tiene su propio plan', async () => {
    const repo = new InMemoryPlanRepo(new MemoryStore());

    const planA = await repo.getOrCreate('farm-a');
    const planB = await repo.getOrCreate('farm-b');

    expect(planA.id).not.toBe(planB.id);
  });
});

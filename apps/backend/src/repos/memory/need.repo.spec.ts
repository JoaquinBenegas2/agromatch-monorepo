import type { Need } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import { InMemoryNeedRepo } from './need.repo.js';

function makeNeed(overrides: Partial<Need> = {}): Need {
  return {
    id: 'need-1',
    farmId: 'farm-a',
    rawText: 'necesito arar 40 ha',
    category: 'MACHINERY',
    what: 'arado',
    constraints: [],
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('InMemoryNeedRepo', () => {
  it('create guarda y findById lo devuelve', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());
    const need = makeNeed();

    await repo.create(need);

    await expect(repo.findById('need-1')).resolves.toEqual(need);
  });

  it('findById devuelve null si no existe', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());

    await expect(repo.findById('no-existe')).resolves.toBeNull();
  });

  it('update pisa los campos de una need existente', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());
    await repo.create(makeNeed());

    const updated = await repo.update(makeNeed({ status: 'OPEN' }));

    expect(updated.status).toBe('OPEN');
    await expect(repo.findById('need-1')).resolves.toMatchObject({ status: 'OPEN' });
  });

  it('update lanza si la need no existe', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());

    await expect(repo.update(makeNeed({ id: 'no-existe' }))).rejects.toThrow();
  });

  it('listByFarm filtra por tambo y excluye sintéticas por default', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());
    await repo.create(makeNeed({ id: 'n-1', farmId: 'farm-a' }));
    await repo.create(makeNeed({ id: 'n-2', farmId: 'farm-a', synthetic: true }));
    await repo.create(makeNeed({ id: 'n-3', farmId: 'farm-b' }));

    const farmANeeds = await repo.listByFarm('farm-a');

    expect(farmANeeds.map((n) => n.id)).toEqual(['n-1']);
  });

  it('listByFarm con includeSynthetic incluye las sintéticas', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());
    await repo.create(makeNeed({ id: 'n-1', farmId: 'farm-a' }));
    await repo.create(makeNeed({ id: 'n-2', farmId: 'farm-a', synthetic: true }));

    const farmANeeds = await repo.listByFarm('farm-a', { includeSynthetic: true });

    expect(farmANeeds.map((n) => n.id).sort()).toEqual(['n-1', 'n-2']);
  });

  it('saveMatchBoard no falla y no filtra la need de otro tambo', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());
    await repo.create(makeNeed({ id: 'n-1' }));

    await expect(
      repo.saveMatchBoard('n-1', { needId: 'n-1', ranked: [], excluded: [] } as never),
    ).resolves.toBeUndefined();
  });

  it('saveMatchBoard lanza si la need no existe', async () => {
    const repo = new InMemoryNeedRepo(new MemoryStore());

    await expect(repo.saveMatchBoard('no-existe', {} as never)).rejects.toThrow();
  });
});

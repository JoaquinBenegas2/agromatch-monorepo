import type { BreedingGoal, Classification } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import { InMemoryClassificationRepo } from './classification.repo.js';

const goal: BreedingGoal = {
  preset: 'SOLIDS_CHEESE',
  weights: { fat: 0.35, pro: 0.35, pl: 0.15, scs: 0.15 },
  wantBetaA2: false,
  wantKappaBB: true,
};

const items: Classification[] = [
  {
    femaleId: 'f-1',
    tier: 'ELITE',
    semenType: 'SEXED',
    ciPercentile: 90,
    tags: [],
    corrective: [],
    reasons: ['motivo'],
  },
];

describe('InMemoryClassificationRepo', () => {
  it('listByFarm devuelve null si nunca se clasificó', async () => {
    const repo = new InMemoryClassificationRepo(new MemoryStore());

    await expect(repo.listByFarm('farm-a')).resolves.toBeNull();
  });

  it('replaceForFarm guarda goal + items, y listByFarm los devuelve', async () => {
    const repo = new InMemoryClassificationRepo(new MemoryStore());

    await repo.replaceForFarm('farm-a', goal, items);
    const stored = await repo.listByFarm('farm-a');

    expect(stored?.goal).toEqual(goal);
    expect(stored?.items).toEqual(items);
  });

  it('una segunda corrida reemplaza la anterior por completo (la última clasificación gana)', async () => {
    const repo = new InMemoryClassificationRepo(new MemoryStore());
    await repo.replaceForFarm('farm-a', goal, items);

    const secondItems: Classification[] = [
      { femaleId: 'f-2', tier: 'BEEF', semenType: null, ciPercentile: 10, tags: [], corrective: [], reasons: [] },
    ];
    await repo.replaceForFarm('farm-a', goal, secondItems);

    const stored = await repo.listByFarm('farm-a');
    expect(stored?.items).toEqual(secondItems);
  });

  it('una farm no ve la clasificación de otra', async () => {
    const repo = new InMemoryClassificationRepo(new MemoryStore());
    await repo.replaceForFarm('farm-a', goal, items);

    await expect(repo.listByFarm('farm-b')).resolves.toBeNull();
  });
});

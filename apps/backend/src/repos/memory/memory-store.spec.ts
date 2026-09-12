import { bullsSeed, capabilities, providers } from '@org/shared-types/fixtures';
import { MemoryStore } from './memory-store.js';

describe('MemoryStore', () => {
  it('siembra los fixtures reales (mismos que prisma/seed.ts)', () => {
    const store = new MemoryStore();

    expect(store.users.size).toBe(4);
    expect(store.farms.size).toBe(3);
    expect(store.bulls.size).toBe(bullsSeed.length);
    expect(store.providers.size).toBe(providers.length);
    expect(store.capabilities.size).toBe(capabilities.length);

    const farmAFemales = [...store.females.values()].filter((f) => f.farmId === 'farm-a');
    expect(farmAFemales).toHaveLength(293);
  });

  it('arranca vacío en las colecciones que no se siembran', () => {
    const store = new MemoryStore();

    expect(store.classifications.size).toBe(0);
    expect(store.plans.size).toBe(0);
    expect(store.needs.size).toBe(0);
    expect(store.serviceRequests.size).toBe(0);
    expect(store.reviews.size).toBe(0);
    expect(store.herdImports.size).toBe(0);
  });

  it('cada instancia parte de un seed independiente (sin estado compartido)', () => {
    const a = new MemoryStore();
    const b = new MemoryStore();

    a.users.delete('tambero-a');

    expect(a.users.size).toBe(3);
    expect(b.users.size).toBe(4);
  });
});

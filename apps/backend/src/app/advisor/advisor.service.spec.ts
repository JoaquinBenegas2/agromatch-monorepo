import type { Classification, Farm, Female, GenomicProfile } from '@org/shared-types';
import { farms, herdFarmA } from '@org/shared-types/fixtures';
import { AdvisorService } from './advisor.service';
import type { ClassificationRepo } from '../../repos/classification.port';
import type { FarmRepo } from '../../repos/farm.port';
import type { FemaleRepo } from '../../repos/female.port';

function farm(id: string): Farm {
  return {
    id,
    name: `Tambo ${id}`,
    location: 'Córdoba (test)',
    tierQuotas: { sexedPct: 25, beefPct: 30 },
    calvingEaseMaxHeifer: 2.5,
    scsGrayZone: { from: 3.1, to: 3.18 },
    plGrayZone: { from: 0, to: 0.2 },
  };
}

function profile(overrides: Partial<GenomicProfile>): GenomicProfile {
  return {
    traits: { ci: 500, milk: 700, fat: 1, pro: 20, pl: 1.5, scs: 2.9, fs: -50, rfi: 4 },
    betaCasein: 'A1/A2',
    kappaCasein: 'AB',
    scale: 'CDCB',
    source: 'test',
    ...overrides,
  };
}

function female(id: string, farmId: string, profileOrNull: GenomicProfile | null): Female {
  return {
    id,
    farmId,
    visualId: id,
    birthDate: '2024-01-01',
    sireNaab: null,
    category: 'COW',
    profile: profileOrNull,
  };
}

function classification(femaleId: string, tier: Classification['tier']): Classification {
  return { femaleId, tier, semenType: null, ciPercentile: 50, tags: [], corrective: [], reasons: [] };
}

describe('AdvisorService (REQ-B-ADV-01)', () => {
  it('calcula total, avgTraits y shares solo sobre hembras con perfil, con byTier en cero sin clasificar', async () => {
    const females: Female[] = [
      female('f1', 'farm-a', profile({ betaCasein: 'A2/A2', kappaCasein: 'BB', traits: { ci: 600, milk: 800, fat: 1.2, pro: 22, pl: 2, scs: 2.8, fs: -30, rfi: 3 } })),
      female('f2', 'farm-a', profile({ betaCasein: 'A1/A1', kappaCasein: 'AA', traits: { ci: 400, milk: 600, fat: 0.8, pro: 18, pl: 1, scs: 3, fs: -70, rfi: 5 } })),
      female('f3', 'farm-a', null),
    ];
    const farmRepo: FarmRepo = {
      findByIds: async (ids) => ids.map(farm),
      findById: async (id) => farm(id),
    };
    const femaleRepo: FemaleRepo = {
      listByFarm: async () => females,
      upsertMany: async () => 0,
      findById: async () => null,
    };
    const classificationRepo: ClassificationRepo = {
      replaceForFarm: async () => undefined,
      listByFarm: async () => null,
    };

    const service = new AdvisorService(farmRepo, femaleRepo, classificationRepo);
    const [summary] = await service.overview({ id: 'asesor-1', name: 'Asesor 1', role: 'ADVISOR', farmIds: ['farm-a'] });

    expect(summary.total).toBe(2);
    expect(summary.byTier).toEqual({ ELITE: 0, COMMERCIAL: 0, BEEF: 0, CULL_ALERT: 0 });
    expect(summary.avgTraits.ci).toBe(500);
    expect(summary.avgTraits.milk).toBe(700);
    expect(summary.a2a2Share).toBeCloseTo(0.5);
    expect(summary.bbShare).toBeCloseTo(0.5);
  });

  it('cuenta byTier a partir de la última clasificación guardada', async () => {
    const females: Female[] = [
      female('f1', 'farm-a', profile({})),
      female('f2', 'farm-a', profile({})),
    ];
    const farmRepo: FarmRepo = { findByIds: async (ids) => ids.map(farm), findById: async (id) => farm(id) };
    const femaleRepo: FemaleRepo = {
      listByFarm: async () => females,
      upsertMany: async () => 0,
      findById: async () => null,
    };
    const classificationRepo: ClassificationRepo = {
      replaceForFarm: async () => undefined,
      listByFarm: async () => ({
        goal: { preset: 'BALANCED', weights: {}, wantBetaA2: false, wantKappaBB: false },
        items: [classification('f1', 'ELITE'), classification('f2', 'COMMERCIAL')],
      }),
    };

    const service = new AdvisorService(farmRepo, femaleRepo, classificationRepo);
    const [summary] = await service.overview({ id: 'asesor-1', name: 'Asesor 1', role: 'ADVISOR', farmIds: ['farm-a'] });

    expect(summary.byTier).toEqual({ ELITE: 1, COMMERCIAL: 1, BEEF: 0, CULL_ALERT: 0 });
  });

  it('devuelve un resumen por cada farmId del usuario', async () => {
    const farmRepo: FarmRepo = { findByIds: async (ids) => ids.map(farm), findById: async (id) => farm(id) };
    const femaleRepo: FemaleRepo = { listByFarm: async () => [], upsertMany: async () => 0, findById: async () => null };
    const classificationRepo: ClassificationRepo = { replaceForFarm: async () => undefined, listByFarm: async () => null };

    const service = new AdvisorService(farmRepo, femaleRepo, classificationRepo);
    const summaries = await service.overview({
      id: 'asesor-1',
      name: 'Asesor 1',
      role: 'ADVISOR',
      farmIds: ['farm-a', 'farm-b', 'farm-c'],
    });

    expect(summaries.map((s) => s.farm.id)).toEqual(['farm-a', 'farm-b', 'farm-c']);
    expect(summaries.every((s) => s.total === 0 && s.a2a2Share === 0 && s.bbShare === 0)).toBe(true);
  });

  it('sobre el fixture real de farm-a: total 293 y a2a2Share ~0.50 (criterio de aceptación)', async () => {
    const farmRepo: FarmRepo = {
      findByIds: async (ids) => farms.filter((f) => ids.includes(f.id)),
      findById: async (id) => farms.find((f) => f.id === id) ?? null,
    };
    const femaleRepo: FemaleRepo = {
      listByFarm: async (farmId) => herdFarmA.females.filter((f) => f.farmId === farmId),
      upsertMany: async () => 0,
      findById: async () => null,
    };
    const classificationRepo: ClassificationRepo = {
      replaceForFarm: async () => undefined,
      listByFarm: async () => null,
    };

    const service = new AdvisorService(farmRepo, femaleRepo, classificationRepo);
    const [summary] = await service.overview({ id: 'asesor-1', name: 'Asesor 1', role: 'ADVISOR', farmIds: ['farm-a'] });

    expect(summary.total).toBe(293);
    expect(summary.a2a2Share).toBeGreaterThanOrEqual(0.48);
    expect(summary.a2a2Share).toBeLessThanOrEqual(0.52);
  });
});

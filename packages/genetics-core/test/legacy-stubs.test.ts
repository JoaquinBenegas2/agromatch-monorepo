import type { Bull, Classification, Farm, Female, TraitStats } from '@org/shared-types';
import { GOAL_PRESETS } from '../src/matching/presets.js';
import { buildAutoPlan } from '../src/legacy-stubs.js';
import { computeTraitStats } from '../src/traits.js';

/**
 * Cobertura de `buildAutoPlan` (B5/`mvp-d-match`, fuera de alcance de A),
 * que desde el Hito 3 usa la implementación real de `scoreCandidates`.
 * `classifyHerd` (B2/`mvp-c-herd`) tiene su propia implementación y tests
 * reales en `src/lib/classification.ts`/`.spec.ts` -- no se duplica acá.
 */

const farm: Farm = {
  id: 'farm-a',
  name: 'Tambo A',
  location: 'Córdoba',
  tierQuotas: { sexedPct: 25, beefPct: 30 },
  calvingEaseMaxHeifer: 2.5,
  scsGrayZone: { from: 3.1, to: 3.18 },
  plGrayZone: { from: 0, to: 0.2 },
};

function makeFemale(overrides: Partial<Female> = {}): Female {
  return {
    id: 'f-1',
    farmId: 'farm-a',
    visualId: '1',
    birthDate: '2023-01-01',
    sireNaab: 'sire-1',
    category: 'COW',
    profile: {
      traits: { ci: 500, milk: 700, fat: 1, pro: 20, pl: 1, scs: 3, fs: 0, rfi: 4 },
      betaCasein: 'A1/A2',
      kappaCasein: 'AB',
      scale: 'CDCB',
      source: 'test',
    },
    ...overrides,
  };
}

function makeBull(overrides: Partial<Bull> = {}): Bull {
  return {
    naab: 'bull-1',
    name: 'Toro 1',
    company: 'Central',
    breed: 'HO',
    profile: {
      traits: { ci: 600, milk: 750, fat: 1.2, pro: 22, pl: 1.5, scs: 2.8, fs: 10, rfi: 3 },
      betaCasein: 'A2/A2',
      kappaCasein: 'BB',
      scale: 'CDCB',
      source: 'test',
    },
    sireNaab: null,
    calvingEase: 2,
    semenTypes: ['CONVENTIONAL'],
    pricePerDose: 20,
    source: 'test',
    ...overrides,
  };
}

describe('buildAutoPlan (B5, fuera de alcance de A) sobre el scoreCandidates real del Hito 3', () => {
  it('asigna el primer toro de ranked a cada hembra clasificada', () => {
    const female = makeFemale();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: [],
      reasons: [],
    };
    const bulls = [makeBull({ naab: 'bull-a' }), makeBull({ naab: 'bull-b' })];
    const stats: TraitStats = computeTraitStats(bulls.map((b) => b.profile!));

    const plan = buildAutoPlan(farm, [female], [classification], bulls, GOAL_PRESETS.BALANCED, stats);
    expect(plan.items).toHaveLength(1);
    expect(plan.totals.doses.CONVENTIONAL).toBe(1);
  });

  it('excluye por tier CULL_ALERT explícito, no solo por semenType null (REQ-D-10)', () => {
    const alive = makeFemale({ id: 'f-alive' });
    const cull = makeFemale({ id: 'f-cull' });
    const classifications: Classification[] = [
      { femaleId: 'f-alive', tier: 'COMMERCIAL', semenType: 'CONVENTIONAL', ciPercentile: 60, tags: [], corrective: [], reasons: [] },
      { femaleId: 'f-cull', tier: 'CULL_ALERT', semenType: 'CONVENTIONAL', ciPercentile: 5, tags: [], corrective: [], reasons: [] },
    ];
    const bulls = [makeBull({ naab: 'bull-a' })];
    const stats = computeTraitStats(bulls.map((b) => b.profile!));

    const plan = buildAutoPlan(farm, [alive, cull], classifications, bulls, GOAL_PRESETS.BALANCED, stats);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].femaleId).toBe('f-alive');
  });

  it('totals.cost ignora pricePerDose null (REQ-D-11)', () => {
    const females = [makeFemale({ id: 'f-1' }), makeFemale({ id: 'f-2' }), makeFemale({ id: 'f-3' })];
    const classifications: Classification[] = females.map((f) => ({
      femaleId: f.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: [],
      reasons: [],
    }));
    const bullFree = makeBull({ naab: 'bull-free', pricePerDose: null });
    const stats = computeTraitStats([bullFree.profile!]);

    const plan = buildAutoPlan(farm, females, classifications, [bullFree], GOAL_PRESETS.BALANCED, stats);
    expect(plan.items).toHaveLength(3);
    expect(plan.totals.cost).toBe(0);
    expect(plan.totals.doses.CONVENTIONAL).toBe(3);
  });

  it('totals.avgExpectedProgeny promedia solo los ítems con perfil (REQ-D-11)', () => {
    const female = makeFemale();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: [],
      reasons: [],
    };
    const bull = makeBull();
    const stats = computeTraitStats([bull.profile!]);

    const plan = buildAutoPlan(farm, [female], [classification], [bull], GOAL_PRESETS.BALANCED, stats);
    expect(plan.totals.avgExpectedProgeny.scs).toBeDefined();
    expect(typeof plan.totals.avgExpectedProgeny.scs).toBe('number');
  });
});

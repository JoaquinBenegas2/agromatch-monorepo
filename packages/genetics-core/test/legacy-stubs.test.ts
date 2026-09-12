import type { Bull, Classification, Farm, Female, TraitStats } from '@org/shared-types';
import { GOAL_PRESETS } from '../src/matching/presets.js';
import { buildAutoPlan, classifyHerd } from '../src/legacy-stubs.js';
import { computeTraitStats } from '../src/traits.js';

/**
 * Cobertura de los stubs de T0 fuera de alcance de `mvp-a-core`
 * (`classifyHerd` es B2/`mvp-c-herd`) y de `buildAutoPlan` (B5/`mvp-d-match`),
 * que desde el Hito 3 usa la implementación real de `scoreCandidates`.
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

describe('classifyHerd (B2, fuera de alcance de A, se relocó intacto)', () => {
  it('reparte en tercios por CI', () => {
    const females = [
      makeFemale({ id: 'f-1', profile: { ...makeFemale().profile!, traits: { ...makeFemale().profile!.traits, ci: 900 } } }),
      makeFemale({ id: 'f-2', profile: { ...makeFemale().profile!, traits: { ...makeFemale().profile!.traits, ci: 500 } } }),
      makeFemale({ id: 'f-3', profile: { ...makeFemale().profile!, traits: { ...makeFemale().profile!.traits, ci: 100 } } }),
    ];
    const classifications = classifyHerd(females, farm, GOAL_PRESETS.BALANCED);
    expect(classifications).toHaveLength(3);
    expect(classifications.find((c) => c.femaleId === 'f-1')?.tier).toBe('ELITE');
    expect(classifications.find((c) => c.femaleId === 'f-3')?.tier).toBe('CULL_ALERT');
  });
});

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
});

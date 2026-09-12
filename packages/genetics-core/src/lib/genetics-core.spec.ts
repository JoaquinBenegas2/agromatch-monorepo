import { matchNeed } from '@org/matching-core';
import type { Bull, Capability, Classification, Farm, Female, Need, Provider, TraitStats } from '@org/shared-types';
import {
  GOAL_PRESETS,
  GeneticsVertical,
  buildAutoPlan,
  calvingEaseFilter,
  caseinOdds,
  classifyHerd,
  computeTraitStats,
  deriveCategory,
  expectedProgeny,
  inbreedingFilter,
  normalize,
  scoreCandidates,
} from './genetics-core.js';

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

describe('genetics-core stubs (REQ-SC-06)', () => {
  it('deriveCategory clasifica por edad', () => {
    expect(deriveCategory('2026-06-01', '2026-09-12')).toBe('CALF');
    expect(deriveCategory('2025-06-01', '2026-09-12')).toBe('HEIFER');
    expect(deriveCategory('2020-06-01', '2026-09-12')).toBe('COW');
  });

  it('computeTraitStats calcula media y desvío por rasgo', () => {
    const stats = computeTraitStats([
      makeFemale().profile!,
      { ...makeFemale().profile!, traits: { ...makeFemale().profile!.traits, ci: 700 } },
    ]);
    expect(stats.mean.ci).toBe(600);
    expect(stats.std.ci).toBeGreaterThan(0);
  });

  it('expectedProgeny promedia madre y padre', () => {
    const progeny = expectedProgeny(makeFemale().profile!.traits, makeBull().profile!.traits);
    expect(progeny.ci).toBe(550);
  });

  it('normalize devuelve 0 si el desvío es 0', () => {
    const stats: TraitStats = {
      mean: { ci: 500, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 },
      std: { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 },
    };
    expect(normalize(600, 'ci', stats)).toBe(0);
  });

  it('caseinOdds calcula probabilidad mendeliana simple', () => {
    const odds = caseinOdds(makeFemale().profile!, makeBull().profile!);
    // dam A1/A2 (0.5 A2) x sire A2/A2 (1 A2) => 0.5
    expect(odds.betaA2A2).toBe(0.5);
    // dam AB (0.5 B) x sire BB (1 B) => 0.5
    expect(odds.kappaBB).toBe(0.5);
  });

  it('inbreedingFilter detecta hija directa y medio hermanos (RN-05)', () => {
    const bull = makeBull({ naab: 'sire-1' });
    const female = makeFemale({ sireNaab: 'sire-1' });
    expect(inbreedingFilter(female, bull).passed).toBe(false);

    const halfSiblingBull = makeBull({ naab: 'bull-2', sireNaab: 'grandsire-1' });
    const femaleWithSameSire = makeFemale({ sireNaab: 'grandsire-1' });
    expect(inbreedingFilter(femaleWithSameSire, halfSiblingBull).passed).toBe(false);

    expect(inbreedingFilter(makeFemale({ sireNaab: 'other' }), makeBull()).passed).toBe(true);
  });

  it('calvingEaseFilter rechaza toros que superan el máximo del tambo en vaquillonas (RN-06)', () => {
    const heifer = makeFemale({ category: 'HEIFER' });
    expect(calvingEaseFilter(heifer, makeBull({ calvingEase: 5 }), farm).passed).toBe(false);
    expect(calvingEaseFilter(heifer, makeBull({ calvingEase: 2 }), farm).passed).toBe(true);
    expect(calvingEaseFilter(makeFemale({ category: 'COW' }), makeBull({ calvingEase: 5 }), farm).passed).toBe(
      true,
    );
  });

  it('classifyHerd reparte en tercios por CI', () => {
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

  it('scoreCandidates devuelve MatchBoard ordenado con compatibility del #1 en 100 (REQ-SC-06)', () => {
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
    const bulls = [
      makeBull({ naab: 'bull-low', profile: { ...makeBull().profile!, traits: { ...makeBull().profile!.traits, ci: 400 } } }),
      makeBull({ naab: 'bull-high', profile: { ...makeBull().profile!, traits: { ...makeBull().profile!.traits, ci: 900 } } }),
      makeBull({ naab: 'bull-mid', profile: { ...makeBull().profile!, traits: { ...makeBull().profile!.traits, ci: 600 } } }),
    ];
    const stats = computeTraitStats(bulls.map((b) => b.profile!));

    const board = scoreCandidates(female, classification, bulls, GOAL_PRESETS.BALANCED, farm, stats);

    expect(board.excluded).toEqual([]);
    expect(board.ranked.map((c) => c.capabilityId)).toEqual(['bull-high', 'bull-mid', 'bull-low']);
    expect(board.ranked[0].compatibility).toBe(100);
    expect(board.ranked.map((c) => c.rank)).toEqual([1, 2, 3]);
  });

  it('buildAutoPlan asigna el primer toro de ranked a cada hembra clasificada', () => {
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
    const stats = computeTraitStats(bulls.map((b) => b.profile!));

    const plan = buildAutoPlan(farm, [female], [classification], bulls, GOAL_PRESETS.BALANCED, stats);
    expect(plan.items).toHaveLength(1);
    expect(plan.totals.doses.CONVENTIONAL).toBe(1);
  });

  it('matchNeed(need, caps, provs, [GeneticsVertical]) da verticalFacts y fit.vertical en [0,1] (REQ-SC-06)', () => {
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

    const need: Need = {
      id: 'need-1',
      farmId: farm.id,
      rawText: 'necesito el mejor toro para esta hembra',
      category: 'GENETICS',
      what: 'matching genético',
      where: { lat: 0, lng: 0, label: 'Establecimiento' },
      window: { from: '2026-01-01', to: '2026-12-31' },
      constraints: [],
      status: 'OPEN',
      goal: GOAL_PRESETS.BALANCED,
      createdAt: '2026-09-12T00:00:00.000Z',
    };
    const capability: Capability = {
      id: bull.naab,
      providerId: 'prov-genetics',
      category: 'GENETICS',
      serviceType: 'semen',
      coverageRadiusKm: 500,
      availability: [],
      priceModel: 'PER_UNIT',
      certifications: [],
      attributes: {},
    };
    const provider: Provider = {
      id: 'prov-genetics',
      name: 'Central Genética',
      type: 'SEMEN_COMPANY',
      base: { lat: 0, lng: 0, label: 'Central' },
      verified: false,
      reputation: { avg: 4, jobs: 10 },
      contact: {},
      source: 'test',
    };

    const board = matchNeed(need, [capability], [provider], [GeneticsVertical], {
      female,
      classification,
      bulls: [bull],
      stats,
    });

    expect(board.ranked).toHaveLength(1);
    expect(board.ranked[0].verticalFacts).toBeDefined();
    expect(board.ranked[0].fit.vertical).toBeGreaterThanOrEqual(0);
    expect(board.ranked[0].fit.vertical).toBeLessThanOrEqual(1);
  });
});

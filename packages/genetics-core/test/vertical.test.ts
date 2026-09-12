import { bullsSeed, herdFarmA } from '@org/shared-types/fixtures';
import type { Capability, Classification, Farm, Need, Provider, TraitStats } from '@org/shared-types';
import { matchNeed } from '@org/matching-core';
import { GOAL_PRESETS } from '../src/matching/presets.js';
import { scoreCandidates } from '../src/matching/score.js';
import { computeTraitStats } from '../src/traits.js';
import { GeneticsVertical } from '../src/vertical.js';

const farm: Farm = {
  id: 'farm-a',
  name: 'Tambo A',
  location: 'Córdoba',
  tierQuotas: { sexedPct: 25, beefPct: 30 },
  calvingEaseMaxHeifer: 2.5,
  scsGrayZone: { from: 3.1, to: 3.18 },
  plGrayZone: { from: 0, to: 0.2 },
};

const dairyStats: TraitStats = computeTraitStats(bullsSeed.filter((b) => b.profile !== null).map((b) => b.profile!));

describe('GeneticsVertical (RN-35, ADR-0002, REQ-A-10)', () => {
  it('canHandle solo para GENETICS', () => {
    const geneticsNeed: Need = {
      id: 'n1',
      farmId: 'farm-a',
      rawText: '',
      category: 'GENETICS',
      what: '',
      where: { lat: 0, lng: 0, label: '' },
      window: { from: '2026-01-01', to: '2026-01-01' },
      constraints: [],
      status: 'OPEN',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const vetNeed: Need = { ...geneticsNeed, category: 'VET' };
    expect(GeneticsVertical.canHandle(geneticsNeed)).toBe(true);
    expect(GeneticsVertical.canHandle(vetNeed)).toBe(false);
  });

  it('mismo resultado por los dos caminos: scoreCandidates y matchNeed+GeneticsVertical', () => {
    const female = herdFarmA.females.find((f) => f.visualId === '3031')!;
    const classification: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: ['scs'],
      reasons: [],
    };
    const goal = GOAL_PRESETS.SOLIDS_CHEESE;

    const direct = scoreCandidates(female, classification, bullsSeed, goal, farm, dairyStats);

    const need: Need = {
      id: 'need-genetics-3031',
      farmId: farm.id,
      rawText: 'matching genético para 3031',
      category: 'GENETICS',
      what: 'matching genético',
      where: { lat: 0, lng: 0, label: 'Establecimiento' },
      window: { from: '2026-01-01', to: '2026-12-31' },
      constraints: [],
      status: 'OPEN',
      goal,
      createdAt: '2026-01-01T00:00:00.000Z',
      synthetic: true,
    };
    const caps: Capability[] = bullsSeed.map((b) => ({
      id: b.naab,
      providerId: 'prov-genetics',
      category: 'GENETICS',
      serviceType: 'semen',
      coverageRadiusKm: 500,
      availability: [],
      priceModel: 'PER_UNIT',
      certifications: [],
      attributes: {},
    }));
    const provs: Provider[] = [
      {
        id: 'prov-genetics',
        name: 'Central Genética',
        type: 'SEMEN_COMPANY',
        base: { lat: 0, lng: 0, label: 'Central' },
        verified: false,
        reputation: { avg: 4, jobs: 10 },
        contact: {},
        source: 'test',
      },
    ];

    const viaVertical = matchNeed(need, caps, provs, [GeneticsVertical], { female, classification, farm, stats: dairyStats, bulls: bullsSeed });

    expect(viaVertical.ranked.map((c) => c.capabilityId)).toEqual(direct.ranked.map((c) => c.capabilityId));
    expect(viaVertical.ranked.map((c) => c.compatibility)).toEqual(direct.ranked.map((c) => c.compatibility));
    expect(viaVertical.ranked.map((c) => (c.verticalFacts as { expectedProgeny: unknown }).expectedProgeny)).toEqual(
      direct.ranked.map((c) => (c.verticalFacts as { expectedProgeny: unknown }).expectedProgeny),
    );
  });

  it('funciona sin farm en el ctx (forma real que usa GeneticMatchingService, B4): RN-06 no se aplica, documentado', () => {
    const female = herdFarmA.females.find((f) => f.visualId === '3031')!;
    const classification: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: ['scs'],
      reasons: [],
    };
    const goal = GOAL_PRESETS.SOLIDS_CHEESE;
    const need: Need = {
      id: 'need-genetics-3031',
      farmId: 'farm-a',
      rawText: 'matching genético para 3031',
      category: 'GENETICS',
      what: 'matching genético',
      where: { lat: 0, lng: 0, label: 'Establecimiento' },
      window: { from: '2026-01-01', to: '2026-12-31' },
      constraints: [],
      status: 'OPEN',
      goal,
      createdAt: '2026-01-01T00:00:00.000Z',
      synthetic: true,
    };
    const caps: Capability[] = bullsSeed.map((b) => ({
      id: b.naab,
      providerId: 'prov-genetics',
      category: 'GENETICS',
      serviceType: 'semen',
      coverageRadiusKm: 500,
      availability: [],
      priceModel: 'PER_UNIT',
      certifications: [],
      attributes: {},
    }));
    const provs: Provider[] = [
      {
        id: 'prov-genetics',
        name: 'Central Genética',
        type: 'SEMEN_COMPANY',
        base: { lat: 0, lng: 0, label: 'Central' },
        verified: false,
        reputation: { avg: 4, jobs: 10 },
        contact: {},
        source: 'test',
      },
    ];

    // Sin `farm`: exactamente la forma de ctx que arma GeneticMatchingService.
    const board = matchNeed(need, caps, provs, [GeneticsVertical], {
      female,
      classification,
      stats: dairyStats,
      bulls: bullsSeed,
    });

    expect(board.ranked.length).toBeGreaterThan(0);
  });

  it('sin need.goal o sin GeneticsMatchContext válido, lanza un error claro', () => {
    const need: Need = {
      id: 'n1',
      farmId: 'farm-a',
      rawText: '',
      category: 'GENETICS',
      what: '',
      where: { lat: 0, lng: 0, label: '' },
      window: { from: '2026-01-01', to: '2026-01-01' },
      constraints: [],
      status: 'OPEN',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const candidate = {
      needId: 'n1',
      capabilityId: 'bull-1',
      providerId: 'p1',
      score: 0,
      compatibility: 0,
      rank: 0,
      fit: { proximity: 0, availability: 0, capacity: 0, price: 0, reputation: 0 },
      filters: [],
      reasons: [],
    };
    expect(() => GeneticsVertical.score(need, candidate, {})).toThrow(/goal/i);
    expect(() => GeneticsVertical.score({ ...need, goal: GOAL_PRESETS.BALANCED }, candidate, {})).toThrow(/GeneticsMatchContext/);
  });
});

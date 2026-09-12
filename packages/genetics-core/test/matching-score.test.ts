import { bullsSeed, herdFarmA } from '@org/shared-types/fixtures';
import type { Bull, Classification, Farm, Female, TraitStats } from '@org/shared-types';
import { GOAL_PRESETS } from '../src/matching/presets.js';
import { scoreCandidates, scoreOneCandidate } from '../src/matching/score.js';
import { computeTraitStats } from '../src/traits.js';

const farm: Farm = {
  id: 'farm-a',
  name: 'Tambo A',
  location: 'Córdoba',
  tierQuotas: { sexedPct: 25, beefPct: 30 },
  calvingEaseMaxHeifer: 2.5,
  scsGrayZone: { from: 3.1, to: 3.18 },
  plGrayZone: { from: 0, to: 0.2 },
};

const dairyBulls = bullsSeed.filter((b) => b.profile !== null);
const dairyStats: TraitStats = computeTraitStats(dairyBulls.map((b) => b.profile!));

function find3031(): Female {
  const female = herdFarmA.females.find((f) => f.visualId === '3031');
  if (!female) throw new Error('fixture 3031 no encontrada en herd-farm-a.json');
  return female;
}

/** Vaca adulta: siempre pasa `calvingEaseFilter` (RN-06), no interfiere con los escenarios que no la testean. */
function makeCow(): Female {
  return {
    id: 'f-cow-test',
    farmId: 'farm-a',
    visualId: 'cow-test',
    birthDate: '2020-01-01',
    sireNaab: 'sire-no-relacionado',
    category: 'COW',
    profile: {
      traits: { ci: 500, milk: 700, fat: 1, pro: 20, pl: 1, scs: 3, fs: 0, rfi: 4 },
      betaCasein: 'A1/A2',
      kappaCasein: 'AB',
      scale: 'CDCB',
      source: 'test',
    },
  };
}

describe('scoreCandidates / scoreOneCandidate — rodeo real (REQ-A-07, REQ-A-08)', () => {
  it('la ternera 3031 se rescata: #1 tiene SCS ≤ 2,80 y la cría esperada baja de 3,00', () => {
    const female = find3031();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: ['scs'],
      reasons: [],
    };

    const board = scoreCandidates(female, classification, bullsSeed, GOAL_PRESETS.SOLIDS_CHEESE, farm, dairyStats);
    const top = board.ranked[0];
    const topBull = bullsSeed.find((b) => b.naab === top.capabilityId);

    expect(topBull?.profile?.traits.scs).toBeLessThanOrEqual(2.8);
    const facts = top.verticalFacts as { expectedProgeny: { scs: number } | null };
    expect(facts.expectedProgeny?.scs).toBeLessThan(3.0);
  });

  it('neutralidad (RN-23/RN-34): cambiar company en todos los toros no cambia el ranking', () => {
    const female = find3031();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: ['scs'],
      reasons: [],
    };

    const original = scoreCandidates(female, classification, bullsSeed, GOAL_PRESETS.SOLIDS_CHEESE, farm, dairyStats);
    const renamed = bullsSeed.map((b) => ({ ...b, company: 'Empresa X' }));
    const withRenamedCompany = scoreCandidates(female, classification, renamed, GOAL_PRESETS.SOLIDS_CHEESE, farm, dairyStats);

    expect(withRenamedCompany.ranked.map((c) => c.capabilityId)).toEqual(original.ranked.map((c) => c.capabilityId));
    expect(withRenamedCompany.ranked.map((c) => c.score)).toEqual(original.ranked.map((c) => c.score));
    expect(withRenamedCompany.ranked.map((c) => c.compatibility)).toEqual(original.ranked.map((c) => c.compatibility));
  });

  it('catálogo por tier (RN-13): una hembra ELITE (SEXED) solo compite contra toros con SEXED', () => {
    const female = find3031();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'ELITE',
      semenType: 'SEXED',
      ciPercentile: 90,
      tags: [],
      corrective: [],
      reasons: [],
    };

    const board = scoreCandidates(female, classification, bullsSeed, GOAL_PRESETS.BALANCED, farm, dairyStats);
    const rankedBulls = board.ranked.map((c) => bullsSeed.find((b) => b.naab === c.capabilityId)!);
    for (const bull of rankedBulls) {
      expect(bull.semenTypes).toContain('SEXED');
    }
    const conventionalOnly = board.excluded.find((c) => c.capabilityId === '029HO20300');
    expect(conventionalOnly?.filters.some((f) => f.rule === 'RN-13')).toBe(true);
  });

  it('CULL_ALERT no tiene candidatos: ranked vacío, todos en excluded', () => {
    const female = find3031();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'CULL_ALERT',
      semenType: null,
      ciPercentile: 5,
      tags: [],
      corrective: [],
      reasons: [],
    };

    const board = scoreCandidates(female, classification, bullsSeed, GOAL_PRESETS.BALANCED, farm, dairyStats);
    expect(board.ranked).toHaveLength(0);
    expect(board.excluded).toHaveLength(bullsSeed.length);
    expect(board.excluded.every((c) => c.reasons.some((r) => r.toLowerCase().includes('descarte')))).toBe(true);
  });

  it('rasgo faltante (toro sin perfil genotipado): compite igual con término 0 y lo dice en reasons', () => {
    const cow = makeCow();
    const classification: Classification = {
      femaleId: cow.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: [],
      reasons: [],
    };
    const bullWithoutProfile: Bull = {
      naab: 'bull-sin-perfil',
      name: 'Sin Perfil',
      company: 'Central',
      breed: 'HO',
      profile: null,
      sireNaab: null,
      calvingEase: 2,
      semenTypes: ['CONVENTIONAL'],
      pricePerDose: 10,
      source: 'test',
    };
    const result = scoreOneCandidate(cow, classification, bullWithoutProfile, GOAL_PRESETS.EFFICIENCY, dairyStats);
    expect(result.score).not.toBe(-Infinity);
    expect(result.facts.expectedProgeny).toBeNull();
    expect(result.reasons.some((r) => r.toLowerCase().includes('no tiene perfil genotipado'))).toBe(true);
  });

  it('correctivos acumulados no dominan el ranking', () => {
    const female = find3031();
    const withCorrective: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: ['scs', 'pl'],
      reasons: [],
    };
    const withoutCorrective: Classification = { ...withCorrective, corrective: [] };

    const boardWith = scoreCandidates(female, withCorrective, bullsSeed, GOAL_PRESETS.SOLIDS_CHEESE, farm, dairyStats);
    const boardWithout = scoreCandidates(female, withoutCorrective, bullsSeed, GOAL_PRESETS.SOLIDS_CHEESE, farm, dairyStats);

    expect(boardWith.ranked.length).toBeGreaterThan(0);
    expect(boardWithout.ranked.length).toBeGreaterThan(0);
    // El bono duplicado no debería mandar al mismo toro con SCS/PL excelentes pero
    // proteína/grasa muy por debajo de la media al #1 sin importar el resto.
    const worstOnFatPro = dairyBulls.reduce((worst, b) =>
      b.profile!.traits.fat + b.profile!.traits.pro < worst.profile!.traits.fat + worst.profile!.traits.pro ? b : worst,
    );
    expect(boardWith.ranked[0].capabilityId).not.toBe(worstOnFatPro.naab);
  });

  it('toros de carne: ordenados por calvingEase ascendente y, a igualdad, por precio; sin expectedProgeny', () => {
    const female = makeCow();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'BEEF',
      semenType: 'BEEF',
      ciPercentile: 10,
      tags: [],
      corrective: [],
      reasons: [],
    };

    const board = scoreCandidates(female, classification, bullsSeed, GOAL_PRESETS.BALANCED, farm, dairyStats);
    const beefBulls = bullsSeed.filter((b) => b.semenTypes.includes('BEEF'));
    expect(board.ranked).toHaveLength(beefBulls.length);

    // Ascendente por calvingEase; los toros sin dato (null) van al final, nunca se los
    // estima -- quedan últimos, no excluidos (RN-16 + regla de oro de faltantes).
    const calvingEases = board.ranked.map((c) => bullsSeed.find((b) => b.naab === c.capabilityId)!.calvingEase);
    const withData = calvingEases.filter((v): v is number => v !== null);
    const withoutData = calvingEases.filter((v) => v === null);
    expect(calvingEases).toEqual([...withData.sort((a, b) => a - b), ...withoutData]);
    board.ranked.forEach((c) => {
      const facts = c.verticalFacts as { expectedProgeny: unknown };
      expect(facts.expectedProgeny).toBeNull();
    });
  });

  it('hija de 029HO19531: el padre y sus hijos quedan en excluded con RN-05', () => {
    const daughter: Female = {
      id: 'f-test-daughter',
      farmId: 'farm-a',
      visualId: 'test-daughter',
      birthDate: '2024-01-01',
      sireNaab: '029HO19531',
      category: 'HEIFER',
      profile: {
        traits: { ci: 500, milk: 700, fat: 1, pro: 20, pl: 1, scs: 3, fs: 0, rfi: 4 },
        betaCasein: 'A1/A2',
        kappaCasein: 'AB',
        scale: 'CDCB',
        source: 'test',
      },
    };
    const classification: Classification = {
      femaleId: daughter.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: [],
      reasons: [],
    };

    const board = scoreCandidates(daughter, classification, bullsSeed, GOAL_PRESETS.BALANCED, farm, dairyStats);
    for (const naab of ['029HO19531', '029HO20001', '029HO20002']) {
      const excludedCandidate = board.excluded.find((c) => c.capabilityId === naab);
      expect(excludedCandidate?.filters.some((f) => f.rule === 'RN-05' && !f.passed)).toBe(true);
    }
  });

  it('compatibilidad bien formada: #1 = 100, todas en 0..100, rank consecutivo', () => {
    const female = find3031();
    const classification: Classification = {
      femaleId: female.id,
      tier: 'COMMERCIAL',
      semenType: 'CONVENTIONAL',
      ciPercentile: 50,
      tags: [],
      corrective: [],
      reasons: [],
    };
    const board = scoreCandidates(female, classification, bullsSeed, GOAL_PRESETS.BALANCED, farm, dairyStats);

    expect(board.ranked[0].compatibility).toBe(100);
    board.ranked.forEach((c) => {
      expect(c.compatibility).toBeGreaterThanOrEqual(0);
      expect(c.compatibility).toBeLessThanOrEqual(100);
    });
    expect(board.ranked.map((c) => c.rank)).toEqual(board.ranked.map((_, i) => i + 1));
    const scores = board.ranked.map((c) => c.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
  });
});

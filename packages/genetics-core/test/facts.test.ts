import { bullsSeed, herdFarmA } from '@org/shared-types/fixtures';
import type { Classification, ExplanationFacts, Farm, TraitStats } from '@org/shared-types';
import { GOAL_PRESETS } from '../src/matching/presets.js';
import { scoreOneCandidate } from '../src/matching/score.js';
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

const dairyStats: TraitStats = computeTraitStats(bullsSeed.filter((b) => b.profile !== null).map((b) => b.profile!));

function collectFactNumbers(facts: ExplanationFacts): number[] {
  const numbers: number[] = [facts.compatibility, facts.rank, facts.totalCandidates];
  if (facts.damTraits) numbers.push(...Object.values(facts.damTraits));
  if (facts.expectedProgeny) numbers.push(...Object.values(facts.expectedProgeny));
  if (facts.deltaVsDam) numbers.push(...Object.values(facts.deltaVsDam));
  if (facts.caseinOdds.betaA2A2 !== null) numbers.push(facts.caseinOdds.betaA2A2);
  if (facts.caseinOdds.kappaBB !== null) numbers.push(facts.caseinOdds.kappaBB);
  return numbers;
}

function numbersInText(text: string): number[] {
  const matches = text.match(/-?\d+(?:,\d+)?/g) ?? [];
  return matches.map((m) => Number(m.replace(',', '.')));
}

describe('invariante RN-17/RN-18: todo número de reasons existe en facts (tolerancia 0,05)', () => {
  it('sobre herd-farm-a × bulls.seed, para todo candidato que sí puntúa', () => {
    const goal = GOAL_PRESETS.SOLIDS_CHEESE;
    let checked = 0;

    for (const female of herdFarmA.females.slice(0, 40)) {
      if (!female.profile) continue;
      const classification: Classification = {
        femaleId: female.id,
        tier: 'COMMERCIAL',
        semenType: 'CONVENTIONAL',
        ciPercentile: 50,
        tags: [],
        corrective: ['scs'],
        reasons: [],
      };

      for (const bull of bullsSeed) {
        const { score, facts, reasons } = scoreOneCandidate(female, classification, bull, goal, dairyStats, farm);
        if (score === -Infinity) continue;

        const factNumbers = collectFactNumbers(facts);
        for (const reason of reasons) {
          for (const n of numbersInText(reason)) {
            const found = factNumbers.some((f) => Math.abs(f - n) <= 0.05);
            expect(found).toBe(true);
          }
        }
        checked += 1;
      }
    }

    expect(checked).toBeGreaterThan(0);
  });
});

describe('snapshot 3031 × #1 (SOLIDS_CHEESE)', () => {
  it('la reason de SCS tiene la forma "La cría esperada mejora SCS de 3,19 a X,XX"', () => {
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

    const results = bullsSeed
      .map((bull) => ({ bull, ...scoreOneCandidate(female, classification, bull, GOAL_PRESETS.SOLIDS_CHEESE, dairyStats, farm) }))
      .filter((r) => r.score !== -Infinity)
      .sort((a, b) => b.score - a.score);

    const top = results[0];
    expect(top.reasons.some((r) => /La cría esperada mejora SCS de 3,19 a \d,\d\d/.test(r))).toBe(true);
  });
});

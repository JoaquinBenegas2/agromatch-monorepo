import type {
  Bull,
  BreedingGoal,
  CaseinOdds,
  Classification,
  ExplanationFacts,
  Farm,
  Female,
  FilterResult,
  MatchBoard,
  MatchCandidate,
  SemenType,
  TraitKey,
  TraitStats,
  TraitVector,
} from '@org/shared-types';
import { caseinOdds as computeCaseinOdds } from '../casein.js';
import { buildReasons, toExplanationFacts } from '../facts.js';
import { calvingEaseFilter, inbreedingFilter } from '../filters.js';
import { expectedProgeny, normalize } from '../traits.js';

interface ScoreResult {
  score: number;
  facts: ExplanationFacts;
  reasons: string[];
}

function rejected(
  female: Female,
  classification: Classification,
  bull: Bull,
  goal: BreedingGoal,
  filters: FilterResult[],
): ScoreResult {
  const reasons = filters.map((f) => f.detail);
  const facts: ExplanationFacts = {
    femaleVisualId: female.visualId,
    femaleCategory: female.category,
    tier: classification.tier,
    corrective: classification.corrective,
    goal,
    bull: { naab: bull.naab, name: bull.name, company: bull.company, breed: bull.breed },
    semenType: bull.semenTypes[0] ?? 'CONVENTIONAL',
    damTraits: female.profile?.traits ?? null,
    expectedProgeny: null,
    deltaVsDam: null,
    caseinOdds: { betaA2A2: null, kappaBB: null },
    compatibility: 0,
    rank: 0,
    totalCandidates: 0,
    reasons,
    filters,
  };
  return { score: -Infinity, facts, reasons };
}

function dairyScore(
  female: Female,
  classification: Classification,
  bull: Bull,
  goal: BreedingGoal,
  stats: TraitStats,
  semenType: SemenType,
): ScoreResult {
  const damTraits = female.profile?.traits ?? null;
  const sireTraits = bull.profile?.traits ?? null;
  const expected: TraitVector | null = damTraits && sireTraits ? expectedProgeny(damTraits, sireTraits) : null;
  const odds: CaseinOdds =
    female.profile && bull.profile ? computeCaseinOdds(female.profile, bull.profile) : { betaA2A2: null, kappaBB: null };

  let score = 0;
  if (expected) {
    for (const [key, weight] of Object.entries(goal.weights) as [TraitKey, number][]) {
      const multiplier = classification.corrective.includes(key) ? 2 : 1;
      score += weight * multiplier * normalize(expected[key], key, stats);
    }
  }
  if (goal.wantBetaA2 && odds.betaA2A2 !== null) score += 0.5 * odds.betaA2A2;
  if (goal.wantKappaBB && odds.kappaBB !== null) score += 0.5 * odds.kappaBB;

  const reasons = buildReasons({
    damTraits,
    expectedProgeny: expected,
    corrective: classification.corrective,
    goal,
    caseinOdds: odds,
    hasProfile: bull.profile !== null,
  });

  const facts = toExplanationFacts({
    female,
    classification,
    bull,
    goal,
    semenType,
    expectedProgeny: expected,
    caseinOdds: odds,
    score,
    compatibility: 0,
    rank: 0,
    totalCandidates: 0,
    reasons,
  });

  return { score, facts, reasons };
}

function beefScore(female: Female, classification: Classification, bull: Bull, goal: BreedingGoal): ScoreResult {
  const calvingEase = bull.calvingEase ?? Number.POSITIVE_INFINITY;
  const reasons = ['Toro de carne: se ordena por facilidad de parto y, a igualdad, por precio (RN-16)'];
  const facts = toExplanationFacts({
    female,
    classification,
    bull,
    goal,
    semenType: 'BEEF',
    expectedProgeny: null,
    caseinOdds: { betaA2A2: null, kappaBB: null },
    score: -calvingEase,
    compatibility: 0,
    rank: 0,
    totalCandidates: 0,
    reasons,
  });
  return { score: -calvingEase, facts, reasons };
}

/**
 * A4 (RN-13, RN-14, RN-16, ADR-0001): par hembra×toro. Rechaza (score
 * -Infinity) el toro que no ofrece el `semenType` del tier de la hembra
 * (RN-13, catálogo por tier), o que no pasa A3 (RN-05/RN-06 — el filtro de
 * parto solo se aplica si se pasa `farm`, aditivo respecto del contrato
 * documentado: `GeneticsMatchContext` ya lo trae para este uso, ver ADR-0002
 * §M3). `company`/`name` no participan del cálculo (RN-23/RN-34).
 */
export function scoreOneCandidate(
  female: Female,
  classification: Classification,
  bull: Bull,
  goal: BreedingGoal,
  stats: TraitStats,
  farm?: Farm,
): ScoreResult {
  const semenType = classification.semenType;
  if (semenType === null) {
    return rejected(female, classification, bull, goal, [
      { rule: 'RN-13', passed: false, detail: 'La hembra está en alerta de descarte (CULL_ALERT): no compite en el matching genético' },
    ]);
  }

  // Se evalúan TODOS los filtros del par (no se corta en el primero que
  // falla): un toro puede fallar RN-13 y RN-05 a la vez, y `excluded` tiene
  // que mostrar el motivo completo (REQ-A-08).
  const filters: FilterResult[] = [
    bull.semenTypes.includes(semenType)
      ? { rule: 'RN-13', passed: true, detail: `El toro ofrece semen ${semenType}` }
      : { rule: 'RN-13', passed: false, detail: `El toro no ofrece semen ${semenType}, requerido por el tier ${classification.tier}` },
  ];
  filters.push(inbreedingFilter(female, bull));
  if (farm) filters.push(calvingEaseFilter(female, bull, farm));

  if (filters.some((f) => !f.passed)) return rejected(female, classification, bull, goal, filters);

  if (semenType === 'BEEF') return beefScore(female, classification, bull, goal);
  return dairyScore(female, classification, bull, goal, stats, semenType);
}

/** A4: batch de conveniencia sobre `scoreOneCandidate` (ADR-0002). */
export function scoreCandidates(
  female: Female,
  classification: Classification,
  bulls: Bull[],
  goal: BreedingGoal,
  farm: Farm,
  stats: TraitStats,
): MatchBoard {
  const scored = bulls.map((bull) => ({ bull, ...scoreOneCandidate(female, classification, bull, goal, stats, farm) }));
  const rejectedEntries = scored.filter((s) => s.score === -Infinity);
  const passing = scored.filter((s) => s.score !== -Infinity);

  if (classification.semenType === 'BEEF') {
    passing.sort(
      (a, b) =>
        (a.bull.calvingEase ?? Infinity) - (b.bull.calvingEase ?? Infinity) ||
        a.bull.breed.localeCompare(b.bull.breed) ||
        (a.bull.pricePerDose ?? Infinity) - (b.bull.pricePerDose ?? Infinity),
    );
  } else {
    passing.sort((a, b) => b.score - a.score || a.bull.naab.localeCompare(b.bull.naab));
  }

  const n = passing.length;
  const min = n ? Math.min(...passing.map((p) => p.score)) : 0;
  const max = n ? Math.max(...passing.map((p) => p.score)) : 0;
  const spread = max - min;

  const ranked: MatchCandidate[] = passing.map((entry, i) => {
    const compatibility = n <= 1 || spread === 0 ? 100 : Math.round((100 * (entry.score - min)) / spread);
    const facts: ExplanationFacts = { ...entry.facts, compatibility, rank: i + 1, totalCandidates: n };
    return {
      needId: '',
      capabilityId: entry.bull.naab,
      providerId: '',
      score: entry.score,
      compatibility,
      rank: i + 1,
      fit: { proximity: 1, availability: 1, capacity: 1, price: 1, reputation: 1, vertical: compatibility / 100 },
      filters: [],
      verticalFacts: facts,
      reasons: entry.reasons,
    };
  });

  const excluded: MatchCandidate[] = rejectedEntries.map((entry) => ({
    needId: '',
    capabilityId: entry.bull.naab,
    providerId: '',
    score: 0,
    compatibility: 0,
    rank: 0,
    fit: { proximity: 0, availability: 0, capacity: 0, price: 0, reputation: 0 },
    filters: entry.facts.filters ?? [],
    verticalFacts: entry.facts,
    reasons: entry.reasons,
  }));

  return { ranked, excluded };
}

import type {
  Bull,
  BreedingGoal,
  BreedingPlan,
  CaseinOdds,
  Classification,
  ExplanationFacts,
  Farm,
  Female,
  FemaleCategory,
  FilterResult,
  GenomicProfile,
  GoalPreset,
  PlanItem,
  SemenType,
  TraitKey,
  TraitStats,
  TraitVector,
} from '@org/shared-types';
import type { MatchBoard, MatchCandidate, Need, VerticalEngine } from '@org/shared-types';
import { TRAIT_DIRECTION } from '@org/shared-types';
export { classifyHerd, classifyHerdClassic } from './classification.js';

/**
 * `genetics-core` — vertical genético enchufado al núcleo (ADR-0002). TS
 * puro: no conoce Nest, Prisma ni el LLM. Todo lo que sigue son los stubs de
 * T0: firma final, implementación ingenua documentada en cada función.
 */

const TRAIT_KEYS: TraitKey[] = ['ci', 'milk', 'fat', 'pro', 'pl', 'scs', 'fs', 'rfi'];

function zeroTraitVector(): TraitVector {
  return { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 };
}

// A1 -----------------------------------------------------------------------

/** Stub: <12 meses CALF, <24 meses HEIFER, el resto COW. */
export function deriveCategory(birthDate: string, today: string): FemaleCategory {
  const birth = new Date(birthDate).getTime();
  const ref = new Date(today).getTime();
  const ageMonths = (ref - birth) / (1000 * 60 * 60 * 24 * 30.4375);
  if (ageMonths < 12) return 'CALF';
  if (ageMonths < 24) return 'HEIFER';
  return 'COW';
}

/** Stub: media y desvío estándar poblacional por rasgo. */
export function computeTraitStats(profiles: GenomicProfile[]): TraitStats {
  const mean = zeroTraitVector();
  const std = zeroTraitVector();
  const n = profiles.length;
  if (n === 0) return { mean, std };

  for (const key of TRAIT_KEYS) {
    const values = profiles.map((p) => p.traits[key]);
    const avg = values.reduce((a, b) => a + b, 0) / n;
    mean[key] = avg;
    const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / n;
    std[key] = Math.sqrt(variance);
  }
  return { mean, std };
}

/** Stub: promedio simple entre madre y padre por rasgo. */
export function expectedProgeny(dam: TraitVector, sire: TraitVector): TraitVector {
  const result = zeroTraitVector();
  for (const key of TRAIT_KEYS) {
    result[key] = (dam[key] + sire[key]) / 2;
  }
  return result;
}

/** Stub: z-score respecto a las estadísticas del tambo (0 si std=0). */
export function normalize(value: number, key: TraitKey, stats: TraitStats): number {
  const std = stats.std[key];
  if (!std) return 0;
  const z = (value - stats.mean[key]) / std;
  return TRAIT_DIRECTION[key] === -1 ? -z : z;
}

// A2 -------------------------------------------------------------------------

function betaA2Share(genotype: GenomicProfile['betaCasein']): number | null {
  switch (genotype) {
    case 'A2/A2':
      return 1;
    case 'A1/A2':
      return 0.5;
    case 'A1/A1':
      return 0;
    default:
      return null;
  }
}

function kappaBShare(genotype: GenomicProfile['kappaCasein']): number | null {
  switch (genotype) {
    case 'BB':
      return 1;
    case 'AB':
    case 'BE':
      return 0.5;
    case 'AA':
    case 'AE':
    case 'EE':
      return 0;
    default:
      return null;
  }
}

/** Stub: probabilidad mendeliana simple por alelo, sin ligamiento. */
export function caseinOdds(dam: GenomicProfile, sire: GenomicProfile): CaseinOdds {
  const damBeta = betaA2Share(dam.betaCasein);
  const sireBeta = betaA2Share(sire.betaCasein);
  const damKappa = kappaBShare(dam.kappaCasein);
  const sireKappa = kappaBShare(sire.kappaCasein);

  return {
    betaA2A2: damBeta === null || sireBeta === null ? null : damBeta * sireBeta,
    kappaBB: damKappa === null || sireKappa === null ? null : damKappa * sireKappa,
  };
}

// A3 -------------------------------------------------------------------------

/** Stub RN-05: hija directa o medio hermanos por el mismo padre. */
export function inbreedingFilter(female: Female, bull: Bull): FilterResult {
  if (female.sireNaab === bull.naab) {
    return { rule: 'RN-05', passed: false, detail: 'La hembra es hija directa de este toro' };
  }
  if (female.sireNaab !== null && female.sireNaab === bull.sireNaab) {
    return {
      rule: 'RN-05',
      passed: false,
      detail: 'La hembra y el toro comparten padre (medio hermanos)',
    };
  }
  return { rule: 'RN-05', passed: true, detail: 'Sin riesgo de consanguinidad detectado' };
}

/** Stub RN-06: facilidad de parto del toro contra el máximo del tambo para vaquillonas. */
export function calvingEaseFilter(female: Female, bull: Bull, farm: Farm): FilterResult {
  if (female.category !== 'HEIFER' || bull.calvingEase === null) {
    return { rule: 'RN-06', passed: true, detail: 'No aplica: no es vaquillona o el toro no declara facilidad de parto' };
  }
  const passed = bull.calvingEase <= farm.calvingEaseMaxHeifer;
  return {
    rule: 'RN-06',
    passed,
    detail: passed
      ? `Facilidad de parto ${bull.calvingEase} dentro del máximo ${farm.calvingEaseMaxHeifer} para vaquillonas`
      : `Facilidad de parto ${bull.calvingEase} supera el máximo ${farm.calvingEaseMaxHeifer} para vaquillonas`,
  };
}

// B2 (mvp-c-herd) --------------------------------------------------------------

// A4 (ADR-0002) ----------------------------------------------------------------

function subtractPartial(a: TraitVector, b: TraitVector): Partial<TraitVector> {
  const result: Partial<TraitVector> = {};
  for (const key of TRAIT_KEYS) {
    result[key] = a[key] - b[key];
  }
  return result;
}

/**
 * Stub: el score crudo es el CI del toro (sin ponderar por objetivo ni
 * aplicar filtros); `scoreCandidates` lo usa solo para ordenar.
 */
export function scoreOneCandidate(
  female: Female,
  classification: Classification,
  bull: Bull,
  goal: BreedingGoal,
  _stats: TraitStats,
): { score: number; facts: ExplanationFacts; reasons: string[] } {
  const damTraits = female.profile?.traits ?? null;
  const sireTraits = bull.profile?.traits ?? null;
  const expectedProgenyTraits = damTraits && sireTraits ? expectedProgeny(damTraits, sireTraits) : null;
  const deltaVsDam = expectedProgenyTraits && damTraits ? subtractPartial(expectedProgenyTraits, damTraits) : null;
  const odds: CaseinOdds =
    female.profile && bull.profile
      ? caseinOdds(female.profile, bull.profile)
      : { betaA2A2: null, kappaBB: null };
  const semenType: SemenType = bull.semenTypes[0] ?? 'CONVENTIONAL';
  const score = bull.profile?.traits.ci ?? 0;
  const reasons = [
    `Puntaje provisorio del stub: CI del toro (${score}) sin ponderar por el objetivo "${goal.preset}"`,
  ];

  const facts: ExplanationFacts = {
    femaleVisualId: female.visualId,
    femaleCategory: female.category,
    tier: classification.tier,
    corrective: classification.corrective,
    goal,
    bull: { naab: bull.naab, name: bull.name, company: bull.company, breed: bull.breed },
    semenType,
    damTraits,
    expectedProgeny: expectedProgenyTraits,
    deltaVsDam,
    caseinOdds: odds,
    compatibility: 0,
    rank: 0,
    totalCandidates: 0,
    reasons,
  };

  return { score, facts, reasons };
}

/** Stub: ordena por CI del toro; `compatibility = 100 − 5·posición`; sin filtros. */
export function scoreCandidates(
  female: Female,
  classification: Classification,
  bulls: Bull[],
  goal: BreedingGoal,
  _farm: Farm,
  stats: TraitStats,
): MatchBoard {
  const scored = bulls.map((bull) => ({ bull, ...scoreOneCandidate(female, classification, bull, goal, stats) }));
  scored.sort((a, b) => b.score - a.score);

  const ranked: MatchCandidate[] = scored.map((entry, i) => {
    const compatibility = Math.max(0, 100 - 5 * i);
    const facts: ExplanationFacts = { ...entry.facts, compatibility, rank: i + 1, totalCandidates: scored.length };
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

  return { ranked, excluded: [] };
}

/**
 * Stub provisorio: la firma final de `toExplanationFacts` se termina de
 * definir en `mvp-a-core` (A5); acá se arma reutilizando `scoreOneCandidate`
 * para que el resto del stub tenga algo consistente que llamar.
 */
export function toExplanationFacts(
  female: Female,
  classification: Classification,
  bull: Bull,
  goal: BreedingGoal,
  stats: TraitStats,
  compatibility: number,
  rank: number,
  totalCandidates: number,
): ExplanationFacts {
  const { facts } = scoreOneCandidate(female, classification, bull, goal, stats);
  return { ...facts, compatibility, rank, totalCandidates };
}

/** Stub B4 (mvp-d-match): Need sintética para el matching de una hembra puntual. */
export function makeGeneticsNeed(farmId: string, femaleId: string, goal: BreedingGoal): Need {
  const now = new Date().toISOString();
  return {
    id: `need-genetics-${femaleId}`,
    farmId,
    rawText: goal.rawText ?? `Necesidad sintética de matching genético para ${femaleId}`,
    category: 'GENETICS',
    what: 'matching genético',
    where: { lat: 0, lng: 0, label: 'Establecimiento' },
    window: { from: now, to: now },
    constraints: [],
    status: 'OPEN',
    goal,
    createdAt: now,
    synthetic: true,
  };
}

/**
 * B5 — REQ-D-10: un `PlanItem` por cada hembra clasificada cuyo `tier` no
 * sea `CULL_ALERT` (nunca un proxy indirecto como "semenType null"), con el
 * toro `#1` de su `MatchBoard`, sin restricción de presupuesto (D6).
 */
export function buildAutoPlan(
  farm: Farm,
  females: Female[],
  classifications: Classification[],
  bulls: Bull[],
  goal: BreedingGoal,
  stats: TraitStats,
): BreedingPlan {
  const items: PlanItem[] = [];
  const expectedProgenyByItem: (Partial<TraitVector> | null)[] = [];

  for (const female of females) {
    const classification = classifications.find((c) => c.femaleId === female.id);
    if (!classification || classification.tier === 'CULL_ALERT' || classification.semenType === null) {
      continue;
    }

    const board = scoreCandidates(female, classification, bulls, goal, farm, stats);
    const top = board.ranked[0];
    if (!top) continue;
    const bull = bulls.find((b) => b.naab === top.capabilityId);
    if (!bull) continue;

    items.push({
      femaleId: female.id,
      bullNaab: bull.naab,
      semenType: classification.semenType,
      compatibility: top.compatibility,
      pricePerDose: bull.pricePerDose,
    });
    expectedProgenyByItem.push((top.verticalFacts as ExplanationFacts | undefined)?.expectedProgeny ?? null);
  }

  const doses: Record<SemenType, number> = { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 };
  let cost = 0;
  for (const item of items) {
    doses[item.semenType] += 1;
    // REQ-D-11: ignora los precios null, nunca los trata como 0.
    if (item.pricePerDose !== null) cost += item.pricePerDose;
  }

  return {
    id: `plan-${farm.id}`,
    farmId: farm.id,
    createdAt: new Date().toISOString(),
    items,
    totals: { doses, cost, avgExpectedProgeny: averageTraits(expectedProgenyByItem) },
  };
}

/** REQ-D-11: promedia solo los ítems que tienen perfil (expectedProgeny no null). */
function averageTraits(vectors: (Partial<TraitVector> | null)[]): Partial<TraitVector> {
  const sums: Partial<Record<TraitKey, number>> = {};
  const counts: Partial<Record<TraitKey, number>> = {};

  for (const vector of vectors) {
    if (!vector) continue;
    for (const key of TRAIT_KEYS) {
      const value = vector[key];
      if (value == null) continue;
      sums[key] = (sums[key] ?? 0) + value;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  const result: Partial<TraitVector> = {};
  for (const key of TRAIT_KEYS) {
    const count = counts[key];
    if (count) result[key] = (sums[key] ?? 0) / count;
  }
  return result;
}

export const GOAL_PRESETS: Record<GoalPreset, BreedingGoal> = {
  BALANCED: {
    preset: 'BALANCED',
    weights: { ci: 0.4, milk: 0.2, fat: 0.1, pro: 0.1, pl: 0.1, scs: 0.1 },
    wantBetaA2: false,
    wantKappaBB: false,
  },
  SOLIDS_CHEESE: {
    preset: 'SOLIDS_CHEESE',
    weights: { fat: 0.35, pro: 0.35, pl: 0.15, scs: 0.15 },
    wantBetaA2: false,
    wantKappaBB: true,
  },
  A2_MILK: {
    preset: 'A2_MILK',
    weights: { ci: 0.5, milk: 0.3, pl: 0.2 },
    wantBetaA2: true,
    wantKappaBB: false,
  },
  VOLUME: {
    preset: 'VOLUME',
    weights: { milk: 0.6, ci: 0.3, pl: 0.1 },
    wantBetaA2: false,
    wantKappaBB: false,
  },
  HEALTH_LONGEVITY: {
    preset: 'HEALTH_LONGEVITY',
    weights: { pl: 0.4, scs: 0.4, ci: 0.2 },
    wantBetaA2: false,
    wantKappaBB: false,
  },
  EFFICIENCY: {
    preset: 'EFFICIENCY',
    weights: { rfi: 0.5, ci: 0.3, milk: 0.2 },
    wantBetaA2: false,
    wantKappaBB: false,
  },
};

/** Contexto que `matching-core`'s `matchNeed` stub reenvía tal cual a `score`. */
export interface GeneticsVerticalContext {
  female: Female;
  classification: Classification;
  bulls: Bull[];
  stats: TraitStats;
}

function fallbackFacts(
  female: Female | undefined,
  classification: Classification | undefined,
  goal: BreedingGoal,
): ExplanationFacts {
  return {
    femaleVisualId: female?.visualId ?? '',
    femaleCategory: female?.category ?? 'COW',
    tier: classification?.tier ?? 'CULL_ALERT',
    corrective: classification?.corrective ?? [],
    goal,
    bull: { naab: '', name: '', company: '', breed: 'HO' },
    semenType: 'CONVENTIONAL',
    damTraits: female?.profile?.traits ?? null,
    expectedProgeny: null,
    deltaVsDam: null,
    caseinOdds: { betaA2A2: null, kappaBB: null },
    compatibility: 0,
    rank: 0,
    totalCandidates: 0,
    reasons: ['No se encontró el toro en el contexto del vertical'],
  };
}

/** M3: vertical genético enchufado al núcleo (RN-35, ADR-0002). */
export const GeneticsVertical: VerticalEngine<ExplanationFacts> = {
  category: 'GENETICS',
  canHandle: (need) => need.category === 'GENETICS',
  score: (need: Need, candidate: MatchCandidate, ctx: unknown) => {
    const context = ctx as GeneticsVerticalContext | undefined;
    const goal = need.goal ?? GOAL_PRESETS.BALANCED;
    const bull = context?.bulls?.find((b) => b.naab === candidate.capabilityId);
    if (!context || !bull) {
      const facts = fallbackFacts(context?.female, context?.classification, goal);
      return { score: 0, facts, reasons: facts.reasons };
    }
    return scoreOneCandidate(context.female, context.classification, bull, goal, context.stats);
  },
};


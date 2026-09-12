import type {
  Bull,
  BreedingGoal,
  BreedingPlan,
  CaseinOdds,
  Classification,
  ExplanationFacts,
  Farm,
  Female,
  GoalPreset,
  PlanItem,
  SemenType,
  Tag,
  Tier,
  TraitStats,
  TraitVector,
} from '@org/shared-types';
import type { MatchBoard, MatchCandidate, Need, VerticalEngine } from '@org/shared-types';
import { caseinOdds } from './casein.js';
import { expectedProgeny } from './traits.js';

/**
 * Stubs de T0 que NO son alcance de `mvp-a-core`: `classifyHerd` /
 * `classifyHerdClassic` son B2 (`mvp-c-herd`); `makeGeneticsNeed` /
 * `buildAutoPlan` son B4/B5 (`mvp-d-match`). Se relocan tal cual, sin tocar
 * su lógica, para que A1-A5/M2/M3 puedan vivir en sus propios archivos.
 * `scoreOneCandidate` / `scoreCandidates` / `toExplanationFacts` /
 * `GOAL_PRESETS` / `GeneticsVertical` son A4/A5/M3: siguen acá como stub
 * hasta que ese hito los reemplace por la implementación real.
 */

// B2 (mvp-c-herd) --------------------------------------------------------------

function classifyByCiThirds(females: Female[]): Classification[] {
  const withProfile = females.filter((f): f is Female & { profile: NonNullable<Female['profile']> } => f.profile !== null);
  const sorted = [...withProfile].sort((a, b) => b.profile.traits.ci - a.profile.traits.ci);
  const n = sorted.length;
  const results: Classification[] = [];

  sorted.forEach((f, i) => {
    const ciPercentile = n <= 1 ? 100 : Math.round((100 * (n - 1 - i)) / (n - 1));
    const position = i / n;
    const tier: Tier = position < 1 / 3 ? 'ELITE' : position < 2 / 3 ? 'COMMERCIAL' : 'CULL_ALERT';
    const semenType: SemenType | null = tier === 'CULL_ALERT' ? null : 'CONVENTIONAL';
    const tags: Tag[] = f.sireNaab === null ? ['NO_SIRE'] : [];

    results.push({
      femaleId: f.id,
      tier,
      semenType,
      ciPercentile,
      tags,
      corrective: [],
      reasons: [`CI en el percentil ${ciPercentile} del tambo (stub: tercios por CI)`],
    });
  });

  for (const f of females) {
    if (f.profile === null) {
      results.push({
        femaleId: f.id,
        tier: 'CULL_ALERT',
        semenType: null,
        ciPercentile: 0,
        tags: f.sireNaab === null ? ['NO_SIRE'] : [],
        corrective: [],
        reasons: ['Sin perfil genotipado (RN-24): no se puede calcular CI'],
      });
    }
  }
  return results;
}

/** Stub: tercios por CI. `goal`/`farm` se ignoran hasta que mvp-c-herd los use. */
export function classifyHerd(females: Female[], _farm: Farm, _goal: BreedingGoal): Classification[] {
  return classifyByCiThirds(females);
}

/** Stub: reglas clásicas, solo para el "47% vs 30%"; hoy es igual a `classifyHerd`. */
export function classifyHerdClassic(females: Female[]): Classification[] {
  return classifyByCiThirds(females);
}

// A4 (ADR-0002) ----------------------------------------------------------------

function subtractPartial(a: TraitVector, b: TraitVector): Partial<TraitVector> {
  const result: Partial<TraitVector> = {};
  for (const key of Object.keys(a) as (keyof TraitVector)[]) {
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

/** Stub B5 (mvp-d-match): primer toro de `ranked` para cada hembra clasificada. */
export function buildAutoPlan(
  farm: Farm,
  females: Female[],
  classifications: Classification[],
  bulls: Bull[],
  goal: BreedingGoal,
  stats: TraitStats,
): BreedingPlan {
  const items: PlanItem[] = [];

  for (const female of females) {
    const classification = classifications.find((c) => c.femaleId === female.id);
    if (!classification || classification.semenType === null) continue;

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
  }

  const doses: Record<SemenType, number> = { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 };
  let cost = 0;
  for (const item of items) {
    doses[item.semenType] += 1;
    if (item.pricePerDose !== null) cost += item.pricePerDose;
  }

  return {
    id: `plan-${farm.id}`,
    farmId: farm.id,
    createdAt: new Date().toISOString(),
    items,
    totals: { doses, cost, avgExpectedProgeny: {} },
  };
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

/** M3: vertical genético enchufado al núcleo (RN-35, ADR-0002). Reemplazado por src/vertical.ts en el Hito 3. */
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

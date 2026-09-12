import type {
  Bull,
  BreedingGoal,
  BreedingPlan,
  Classification,
  Farm,
  Female,
  PlanItem,
  SemenType,
  Tag,
  Tier,
  TraitStats,
} from '@org/shared-types';
import type { Need } from '@org/shared-types';
import { scoreCandidates } from './matching/score.js';

/**
 * Stubs de T0 que NO son alcance de `mvp-a-core`: `classifyHerd` /
 * `classifyHerdClassic` son B2 (`mvp-c-herd`); `makeGeneticsNeed` /
 * `buildAutoPlan` son B4/B5 (`mvp-d-match`). Se relocan tal cual, sin tocar
 * su lógica. `buildAutoPlan` ya usa la implementación real de
 * `scoreCandidates` (Hito 3: A4+A5+M3).
 */

// B2 (mvp-c-herd) --------------------------------------------------------------

function classifyByCiThirds(females: Female[]): Classification[] {
  const withProfile = females.filter((f): f is Female & { profile: NonNullable<Female['profile']> } => f.profile !== null);
  const sorted = [...withProfile].sort((a, b) => (b.profile.traits.ci ?? 0) - (a.profile.traits.ci ?? 0));
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

// mvp-d-match --------------------------------------------------------------

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

/** Stub B5 (mvp-d-match): primer toro de `ranked` (ya real, Hito 3) para cada hembra clasificada. */
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

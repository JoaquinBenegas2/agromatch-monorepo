import type {
  Bull,
  BreedingGoal,
  BreedingPlan,
  Classification,
  ExplanationFacts,
  Farm,
  Female,
  PlanItem,
  SemenType,
  TraitKey,
  TraitStats,
  TraitVector,
} from '@org/shared-types';
import type { Need } from '@org/shared-types';
import { scoreCandidates } from './matching/score.js';

export { classifyHerd, classifyHerdClassic } from './lib/classification.js';

/**
 * `makeGeneticsNeed`/`buildAutoPlan` son B4/B5 (`mvp-d-match`), fuera de
 * alcance de `mvp-a-core`. `buildAutoPlan` ya usa la implementación real de
 * `scoreCandidates` (Hito 3: A4+A5+M3) y las reglas REQ-D-10/REQ-D-11.
 */

/**
 * B4 (mvp-d-match): Need sintética para el matching de una hembra puntual.
 *
 * NO declara `where` ni `window` a propósito. Una pajuela de semen viaja por
 * correo: ni la distancia al proveedor ni una ventana de fechas deciden si un
 * toro sirve para esta vaca. Antes se rellenaban con `{lat:0,lng:0}` y una
 * ventana de ancho cero; cuando `hardFilters` dejó de ser un stub, ese
 * placeholder (Golfo de Guinea) quedaba a 7.580 km de cualquier proveedor
 * argentino y RN-31 descartaba el catálogo entero: el swipe mostraba cero
 * toros. Ambos campos son opcionales desde `contracts-v1`, así que la
 * necesidad simplemente no los declara y el núcleo no evalúa esos filtros.
 */
export function makeGeneticsNeed(farmId: string, femaleId: string, goal: BreedingGoal): Need {
  const now = new Date().toISOString();
  return {
    id: `need-genetics-${femaleId}`,
    farmId,
    rawText: goal.rawText ?? `Necesidad sintética de matching genético para ${femaleId}`,
    category: 'GENETICS',
    what: 'matching genético',
    constraints: [],
    status: 'OPEN',
    goal,
    createdAt: now,
    synthetic: true,
  };
}

const TRAIT_KEYS: TraitKey[] = ['ci', 'milk', 'fat', 'pro', 'pl', 'scs', 'fs', 'rfi'];

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

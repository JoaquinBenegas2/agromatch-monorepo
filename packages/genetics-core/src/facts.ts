import type {
  BreedingGoal,
  Bull,
  CaseinOdds,
  Classification,
  ExplanationFacts,
  Female,
  SemenType,
  TraitKey,
  TraitVector,
} from '@org/shared-types';

/** A5 (Q1 de la spec): aditivo, no tocaba `shared-types` — entrada de `toExplanationFacts`. */
export interface ToExplanationFactsInput {
  female: Female;
  classification: Classification;
  bull: Bull;
  goal: BreedingGoal;
  semenType: SemenType;
  expectedProgeny: TraitVector | null;
  caseinOdds: CaseinOdds;
  score: number;
  compatibility: number;
  rank: number;
  totalCandidates: number;
  reasons: string[];
}

function subtractPartial(a: TraitVector, b: TraitVector): Partial<TraitVector> {
  const result: Partial<TraitVector> = {};
  for (const key of Object.keys(a) as (keyof TraitVector)[]) {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue !== undefined && bValue !== undefined) result[key] = aValue - bValue;
  }
  return result;
}

/** A5 (RN-17): construye el `ExplanationFacts` completo que la IA solo redacta. */
export function toExplanationFacts(input: ToExplanationFactsInput): ExplanationFacts {
  const damTraits = input.female.profile?.traits ?? null;
  const deltaVsDam = input.expectedProgeny && damTraits ? subtractPartial(input.expectedProgeny, damTraits) : null;

  return {
    femaleVisualId: input.female.visualId,
    femaleCategory: input.female.category,
    tier: input.classification.tier,
    corrective: input.classification.corrective,
    goal: input.goal,
    bull: { naab: input.bull.naab, name: input.bull.name, company: input.bull.company, breed: input.bull.breed },
    semenType: input.semenType,
    damTraits,
    expectedProgeny: input.expectedProgeny,
    deltaVsDam,
    caseinOdds: input.caseinOdds,
    compatibility: input.compatibility,
    rank: input.rank,
    totalCandidates: input.totalCandidates,
    reasons: input.reasons,
  };
}

const TRAIT_LABELS: Record<TraitKey, string> = {
  ci: 'CI',
  milk: 'litros de leche',
  fat: '% de grasa',
  pro: '% de proteína',
  pl: 'PL',
  scs: 'SCS',
  fs: 'FS',
  rfi: 'RFI',
};

/** Formato rioplatense: coma decimal, dos decimales (RN-18: tolerancia 0,05 contra `facts`). */
function formatEs(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * A5 (RN-17, RN-18): textos determinísticos, nunca de la IA. Cada número que
 * aparece acá tiene que existir literal en `ExplanationFacts` (mismo valor
 * antes de formatear, tolerancia 0,05 por el redondeo a 1 decimal).
 */
export function buildReasons(input: {
  damTraits: TraitVector | null;
  expectedProgeny: TraitVector | null;
  corrective: TraitKey[];
  goal: BreedingGoal;
  caseinOdds: CaseinOdds;
  hasProfile: boolean;
  missingWeightedTraits?: TraitKey[];
}): string[] {
  const reasons: string[] = [];

  if (!input.hasProfile) {
    reasons.push('El toro no tiene perfil genotipado: los términos de rasgo valen 0 (no se rellena con un promedio)');
  } else if (input.damTraits && input.expectedProgeny) {
    for (const key of input.corrective) {
      if (input.goal.weights[key] === undefined) continue;
      const dam = input.damTraits[key];
      const expected = input.expectedProgeny[key];
      if (dam === undefined || expected === undefined) continue;
      const label = TRAIT_LABELS[key];
      const improves = (expected - dam) * (key === 'scs' || key === 'rfi' ? -1 : 1) > 0;
      reasons.push(
        improves
          ? `La cría esperada mejora ${label} de ${formatEs(dam)} a ${formatEs(expected)}`
          : `La cría esperada queda en ${label} ${formatEs(expected)} (partiendo de ${formatEs(dam)})`,
      );
    }
  }

  for (const key of input.missingWeightedTraits ?? []) {
    reasons.push(`Al toro le falta el dato de ${TRAIT_LABELS[key]}: ese término no participa del puntaje (deseable, no se rellena con un promedio)`);
  }

  if (input.goal.wantBetaA2 && input.caseinOdds.betaA2A2 !== null) {
    reasons.push(`Probabilidad de cría A2/A2 (beta caseína): ${formatEs(input.caseinOdds.betaA2A2)}`);
  }
  if (input.goal.wantKappaBB && input.caseinOdds.kappaBB !== null) {
    reasons.push(`Probabilidad de cría BB (kappa caseína): ${formatEs(input.caseinOdds.kappaBB)}`);
  }

  return reasons;
}

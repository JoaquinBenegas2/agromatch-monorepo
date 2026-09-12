import type { Bull, Classification, ExplanationFacts, Farm, Female, MatchCandidate, Need, TraitStats, VerticalEngine } from '@org/shared-types';
import { scoreOneCandidate } from './matching/score.js';

/**
 * Contexto que `mvp-d-match` (B4, `GeneticMatchingService`) pasa a
 * `matchNeed` para que `GeneticsVertical.score` trabaje (ADR-0002).
 * `bulls` en vez de un lookup por naab: es la forma que ya produce el
 * caller real (`apps/backend/src/app/genetic-matching/genetic-matching.service.ts`),
 * armar el índice acá adentro es más simple que pedirle a B4 que lo
 * construya. `farm` es opcional: sin ella, `calvingEaseFilter` (RN-06) no
 * se aplica -- documentado, no se resuelve en silencio.
 */
export interface GeneticsMatchContext {
  female: Female;
  classification: Classification;
  bulls: Bull[];
  stats: TraitStats;
  farm?: Farm;
}

function isGeneticsMatchContext(ctx: unknown): ctx is GeneticsMatchContext {
  return (
    !!ctx &&
    typeof ctx === 'object' &&
    'female' in ctx &&
    'classification' in ctx &&
    'stats' in ctx &&
    'bulls' in ctx &&
    Array.isArray((ctx as { bulls: unknown }).bulls)
  );
}

/** M3 (RN-35, ADR-0002): el vertical genético enchufado al núcleo, envolviendo `scoreOneCandidate`. */
export const GeneticsVertical: VerticalEngine<ExplanationFacts> = {
  category: 'GENETICS',
  canHandle: (need: Need) => need.category === 'GENETICS',
  score: (need: Need, candidate: MatchCandidate, ctx: unknown) => {
    if (!need.goal) {
      throw new Error('GeneticsVertical.score requiere need.goal (BreedingGoal)');
    }
    if (!isGeneticsMatchContext(ctx)) {
      throw new Error('GeneticsVertical.score requiere un GeneticsMatchContext válido en ctx');
    }
    const bull = ctx.bulls.find((b) => b.naab === candidate.capabilityId);
    if (!bull) {
      throw new Error(`GeneticsVertical.score: no se encontró el toro ${candidate.capabilityId} en bulls`);
    }
    return scoreOneCandidate(ctx.female, ctx.classification, bull, need.goal, ctx.stats, ctx.farm);
  },
};

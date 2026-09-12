import type { Bull, Classification, ExplanationFacts, Farm, Female, MatchCandidate, Need, TraitStats, VerticalEngine } from '@org/shared-types';
import { scoreOneCandidate } from './matching/score.js';

/** Contexto que `mvp-d-match` (B4) pasa a `matchNeed` para que `GeneticsVertical.score` trabaje (ADR-0002). */
export interface GeneticsMatchContext {
  female: Female;
  classification: Classification;
  farm: Farm;
  stats: TraitStats;
  bullsByNaab: Record<string, Bull>;
}

function isGeneticsMatchContext(ctx: unknown): ctx is GeneticsMatchContext {
  return (
    !!ctx &&
    typeof ctx === 'object' &&
    'female' in ctx &&
    'classification' in ctx &&
    'farm' in ctx &&
    'stats' in ctx &&
    'bullsByNaab' in ctx
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
    const bull = ctx.bullsByNaab[candidate.capabilityId];
    if (!bull) {
      throw new Error(`GeneticsVertical.score: no se encontró el toro ${candidate.capabilityId} en bullsByNaab`);
    }
    return scoreOneCandidate(ctx.female, ctx.classification, bull, need.goal, ctx.stats, ctx.farm);
  },
};

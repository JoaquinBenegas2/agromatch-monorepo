import type { BreedingGoal, GoalPreset } from '@org/shared-types';

/**
 * A4 (Q2 de la spec: los pesos concretos son una decisión por defecto de A,
 * no están fijados por el handoff). Cada preset suma 1.
 */
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

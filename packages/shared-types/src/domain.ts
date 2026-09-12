import type { z } from 'zod';
import {
  BetaCaseinSchema,
  BreedSchema,
  BreedingGoalSchema,
  BreedingPlanSchema,
  BullSchema,
  CaseinOddsSchema,
  ClassificationSchema,
  ExplanationFactsSchema,
  ExplanationSchema,
  FarmSchema,
  FemaleCategorySchema,
  FemaleSchema,
  FilterResultSchema,
  GenomicProfileSchema,
  GoalPresetSchema,
  GrayZoneSchema,
  KappaCaseinSchema,
  PlanItemSchema,
  RoleSchema,
  RuleIdSchema,
  ScaleSchema,
  SemenTypeSchema,
  TagSchema,
  TierQuotasSchema,
  TierSchema,
  TraitKeySchema,
  TraitStatsSchema,
  TraitVectorSchema,
  UserSchema,
} from './schemas.js';

export type Scale = z.infer<typeof ScaleSchema>;
export type TraitKey = z.infer<typeof TraitKeySchema>;
export type TraitVector = z.infer<typeof TraitVectorSchema>;

/** RN-03: +1 más es mejor, -1 menos es mejor. */
export const TRAIT_DIRECTION: Record<TraitKey, 1 | -1> = {
  ci: 1,
  milk: 1,
  fat: 1,
  pro: 1,
  pl: 1,
  scs: -1,
  fs: 1,
  rfi: -1,
};

export type BetaCasein = z.infer<typeof BetaCaseinSchema>;
export type KappaCasein = z.infer<typeof KappaCaseinSchema>;
export type GenomicProfile = z.infer<typeof GenomicProfileSchema>;

export type FemaleCategory = z.infer<typeof FemaleCategorySchema>;
export type Female = z.infer<typeof FemaleSchema>;

export type SemenType = z.infer<typeof SemenTypeSchema>;
export type Breed = z.infer<typeof BreedSchema>;
export type Bull = z.infer<typeof BullSchema>;

export type TierQuotas = z.infer<typeof TierQuotasSchema>;
export type GrayZone = z.infer<typeof GrayZoneSchema>;
export type Farm = z.infer<typeof FarmSchema>;

export type GoalPreset = z.infer<typeof GoalPresetSchema>;
export type BreedingGoal = z.infer<typeof BreedingGoalSchema>;

export type Tier = z.infer<typeof TierSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Classification = z.infer<typeof ClassificationSchema>;

export type RuleId = z.infer<typeof RuleIdSchema>;
export type FilterResult = z.infer<typeof FilterResultSchema>;
export type CaseinOdds = z.infer<typeof CaseinOddsSchema>;

// MatchResult / MatchSet NO EXISTEN (ADR-0002). El vertical usa MatchCandidate /
// MatchBoard de marketplace.ts; lo genético viaja en MatchCandidate.verticalFacts.

export type ExplanationFacts = z.infer<typeof ExplanationFactsSchema>;
export type Explanation = z.infer<typeof ExplanationSchema>;

export type PlanItem = z.infer<typeof PlanItemSchema>;
export type BreedingPlan = z.infer<typeof BreedingPlanSchema>;

export type Role = z.infer<typeof RoleSchema>;
export type User = z.infer<typeof UserSchema>;

export type TraitStats = z.infer<typeof TraitStatsSchema>;

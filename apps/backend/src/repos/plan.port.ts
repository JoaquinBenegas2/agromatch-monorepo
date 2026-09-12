import type { BreedingPlan } from '@org/shared-types';

export interface PlanRepo {
  getOrCreate(farmId: string): Promise<BreedingPlan>;
  save(plan: BreedingPlan): Promise<BreedingPlan>;
}

export const PLAN_REPO = Symbol('PLAN_REPO');

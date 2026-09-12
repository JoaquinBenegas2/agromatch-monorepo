import type { BreedingGoal, Classification } from '@org/shared-types';

export interface ClassificationRepo {
  replaceForFarm(farmId: string, goal: BreedingGoal, c: Classification[]): Promise<void>;
  listByFarm(
    farmId: string,
  ): Promise<{ goal: BreedingGoal; items: Classification[] } | null>;
}

export const CLASSIFICATION_REPO = Symbol('CLASSIFICATION_REPO');

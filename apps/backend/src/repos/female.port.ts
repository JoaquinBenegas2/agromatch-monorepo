import type { Female } from '@org/shared-types';

export interface FemaleRepo {
  listByFarm(farmId: string): Promise<Female[]>;
  upsertMany(farmId: string, f: Female[]): Promise<number>;
  findById(farmId: string, id: string): Promise<Female | null>;
}

export const FEMALE_REPO = Symbol('FEMALE_REPO');

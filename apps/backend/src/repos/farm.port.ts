import type { Farm } from '@org/shared-types';

export interface FarmRepo {
  findByIds(ids: string[]): Promise<Farm[]>;
  findById(id: string): Promise<Farm | null>;
}

export const FARM_REPO = Symbol('FARM_REPO');

import type { Bull } from '@org/shared-types';

export interface BullRepo {
  list(): Promise<Bull[]>;
  findByNaab(naab: string): Promise<Bull | null>;
  upsertMany(b: Bull[]): Promise<{ added: number; updated: number }>;
}

export const BULL_REPO = Symbol('BULL_REPO');
